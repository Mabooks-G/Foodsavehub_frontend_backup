import React, { createContext, useState, useEffect } from 'react';
import {
  getStakeholderId,
  getUserChats,
  markChatRead as markChatReadService,
  updateChatHistory,
  markDelivered as markDeliveredService,
  deleteUserChat as deleteUserChatService,
  getChatBlockStatus as getChatBlockStatusService,
} from '../services/chatServices';
import { io } from 'socket.io-client';

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added online_users_update listener for real-time online status
   Description: Provides context for chat state, encryption, websocket events, and helper functions
*/
const ChatContext = createContext();

// ----------------------------
// Base64 helpers
// ----------------------------
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ----------------------------
// AES-GCM encryption helpers
// ----------------------------
async function encryptWithKey(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { ciphertextB64: bufToBase64(cipherBuffer), ivB64: bufToBase64(iv) };
}

// ----------------------------
// Key derivation
// ----------------------------
const keyCache = new Map();
async function deriveKey(donationId) {
  if (keyCache.has(donationId)) return keyCache.get(donationId);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(donationId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("chat-e2ee"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  keyCache.set(donationId, key);
  return key;
}

// ----------------------------
// Decryption helper
// ----------------------------
const ivCache = new Map();
async function decryptMessage(msg) {
  if (!msg.chathistory || !msg.donationid) {
    return { ...msg, chathistory: "" };
  }

  try {
    if (!msg.iv && !ivCache.has(msg.chatid)) {
      console.warn(`IV missing for chat ${msg.chatid}, assuming plaintext`);
      return { ...msg, chathistory: msg.chathistory };
    }

    const key = await deriveKey(msg.donationid);
    const ivB64 = msg.iv || ivCache.get(msg.chatid);
    const rawCipher = base64ToBuf(msg.chathistory);
    const rawIv = base64ToBuf(ivB64);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: rawIv },
      key,
      rawCipher
    );

    const decryptedText = new TextDecoder().decode(decrypted);
    return { ...msg, chathistory: decryptedText };
  } catch (err) {
    console.error(`Failed to decrypt message ${msg.chatid}:`, err);
    return { ...msg, chathistory: msg.chathistory };
  }
}

// ----------------------------
// ChatProvider component
// ----------------------------
export const ChatProvider = ({ children, currentUserEmail, currentUserId: initialUserId }) => {
  const [channels, setChannels] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(initialUserId || null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map()); // Map<donationId, { userId, userName }>
  const readCache = new Set();

  /* Fetch stakeholderId */
  useEffect(() => {
    if (!currentUserEmail || currentUserId) return;
    (async () => {
      try {
        const response = await getStakeholderId(currentUserEmail);
        if (!response?.stakeholderid) return;
        setCurrentUserId(response.stakeholderid);
        console.log('Current user ID set:', response.stakeholderid);
      } catch (err) {
        console.error('Error fetching stakeholderId:', err);
      }
    })();
  }, [currentUserEmail, currentUserId]);

  /* Polling function */
  const fetchChats = async () => {
    if (!currentUserEmail) return;

    try {
      const data = await getUserChats(currentUserEmail);

      if (!data?.length) {
        setChannels([]);
        return;
      }

      // Decrypt all messages
      const decryptedData = await Promise.all(data.map(decryptMessage));

      // Cache IVs and attach deleted_by info
      decryptedData.forEach(msg => {
        if (msg.iv) ivCache.set(msg.chatid, msg.iv);
        // Ensure deleted_by is always an array
        msg.deleted_by = msg.deleted_by || [];
      });

      // Update channels state - preserve existing display properties to prevent recalculation
      setChannels(prevChannels => {
        const serverIds = new Set(decryptedData.map(msg => String(msg.chatid)));

        // Keep only temp messages whose chatid is not yet returned from server
        const tempMessages = prevChannels.filter(
          msg => String(msg.chatid).startsWith('temp-') && !serverIds.has(msg.chatid)
        );

        // Create a map of existing messages with their display properties
        const existingMap = new Map(
          prevChannels.map(msg => [String(msg.chatid), msg])
        );

        // Merge server data with existing display properties
        const mergedServer = decryptedData.map(serverMsg => {
          const existing = existingMap.get(String(serverMsg.chatid));
          
          // If message already exists with pre-computed display props, preserve them
          if (existing && existing.displayTimestamp && existing.localTime && 
              existing.localDate && existing.formattedDate) {
            return {
              ...serverMsg,
              displayTimestamp: existing.displayTimestamp,
              localTime: existing.localTime,
              localDate: existing.localDate,
              formattedDate: existing.formattedDate,
            };
          }
          
          // Otherwise return as-is (ChatThread will compute on first render)
          return serverMsg;
        });

        const merged = [...mergedServer, ...tempMessages];

        // Deduplicate by chatid
        const deduped = Array.from(
          new Map(merged.map(msg => [String(msg.chatid), msg])).values()
        );

        return deduped;
      });

    } catch (err) {
      console.error('Polling getUserChats error:', err);
    }
  };

  // Polling useEffect
  useEffect(() => {
    if (!currentUserId) return;
    fetchChats();
    const intervalId = setInterval(fetchChats, 5000);
    return () => clearInterval(intervalId);
  }, [currentUserId]);

  /* WebSocket connection - UPDATED with online_users_update listener */
  useEffect(() => {
    if (!currentUserId) return;
    
    console.log('🔌 Initializing WebSocket for user:', currentUserId);
    
    const newSocket = io(process.env.REACT_APP_BACKEND_URL, { 
      query: { userId: currentUserId },
      transports: ['websocket', 'polling']
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket connected:', newSocket.id);
      newSocket.emit('joinUser', { userId: currentUserId });
    });

    // Message updates - DON'T refetch on newMessage (causes flickering)
    // The optimistic update + server save already handles display
    // Only refetch for delivery/read status changes
    newSocket.on('messageDelivered', fetchChats);
    newSocket.on('messageRead', fetchChats);

    // Typing indicators
    newSocket.on('userTyping', ({ donationId, userId, userName }) => {
      console.log('⌨️ User typing:', userName, 'in donation', donationId);
      setTypingUsers(prev => {
        const updated = new Map(prev);
        updated.set(donationId, { userId, userName });
        return updated;
      });
    });

    newSocket.on('userStoppedTyping', ({ donationId }) => {
      console.log('⌨️ User stopped typing in donation', donationId);
      setTypingUsers(prev => {
        const updated = new Map(prev);
        updated.delete(donationId);
        return updated;
      });
    });

    // Online users tracking - PRIMARY listener
    newSocket.on('onlineUsers', (onlineIds) => {
      console.log('📡 Online users list received:', onlineIds);
      // Convert all IDs to numbers for consistent comparison
      const normalizedIds = onlineIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id);
      console.log('📡 Normalized online users:', normalizedIds);
      setOnlineUsers(new Set(normalizedIds));
    });

    // Individual user events for real-time updates
    newSocket.on('userConnected', (userId) => {
      console.log('🟢 User connected:', userId);
      // Normalize to number
      const normalizedId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.add(normalizedId);
        console.log('Updated online users:', Array.from(updated));
        return updated;
      });
    });

    newSocket.on('userDisconnected', (userId) => {
      console.log('🔴 User disconnected:', userId);
      // Normalize to number
      const normalizedId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
      setOnlineUsers(prev => { 
        const updated = new Set(prev); 
        updated.delete(normalizedId); 
        console.log('Updated online users:', Array.from(updated));
        return updated; 
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    newSocket.on('reconnect', () => {
      console.log('🔄 Socket reconnected, rejoining...');
      newSocket.emit('joinUser', { userId: currentUserId });
    });

    newSocket.on('error', (error) => {
      console.error('⚠️ Socket error:', error);
    });

    return () => {
      console.log('Cleaning up socket for user:', currentUserId);
      newSocket.disconnect();
    };
  }, [currentUserId]);

  /* Add message */
  const addMessage = async (senderId, text, donationId) => {
    if (!donationId || !senderId || !text.trim()) return;

    try {
      const key = await deriveKey(donationId);
      const { ciphertextB64, ivB64 } = await encryptWithKey(key, text);

      // Create timestamp IMMEDIATELY for consistent display
      const tempTimestamp = new Date().toISOString();
      const msgDate = new Date(tempTimestamp); // Use current time directly (browser handles timezone)
      const currentYear = new Date().getFullYear();
      const showYear = msgDate.getFullYear() !== currentYear;
      const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
        day: "numeric",
        month: "long",
        year: showYear ? "numeric" : undefined,
      });
      
      // Pre-computed display properties (computed ONCE, never recalculated)
      const preComputedProps = {
        displayTimestamp: msgDate.getTime(),
        localTime: msgDate.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
        localDate: msgDate.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" }),
        formattedDate: dateFormatter.format(msgDate),
      };

      // Create optimistic temp message
      const tempChatId = `temp-${Date.now()}`;
      const optimisticMessage = {
        chatid: tempChatId,
        donationid: donationId,
        senderid: senderId,
        chathistory: text,
        decryptedText: text,
        iv: ivB64,
        message_timestamp: tempTimestamp,
        readreceipts: false,
        delivered: false,
        ...preComputedProps, // Display properties set ONCE
      };

      ivCache.set(tempChatId, ivB64);
      
      // Add message to channels immediately
      setChannels(prev => [...prev, optimisticMessage]);

      // Save to server in background
      const saved = await updateChatHistory(
        donationId,
        senderId,
        ciphertextB64,
        ivB64,
        tempTimestamp
      );

      // Replace temp message with server response, preserving ALL display properties
      const savedWithIv = { 
        ...saved, 
        iv: ivB64,
        message_timestamp: tempTimestamp,
        decryptedText: text,
        ...preComputedProps, // SAME display properties - no recalculation
      };
      
      ivCache.set(saved.chatid, ivB64);

      // Replace temp with real message (single atomic update)
      setChannels(prev =>
        prev.map(msg =>
          msg.chatid === tempChatId ? savedWithIv : msg
        )
      );

      // Emit to WebSocket for OTHER users (don't trigger our own refetch)
      if (socket) socket.emit('newMessage', savedWithIv);

    } catch (err) {
      console.error('addMessage backend error:', err);
      throw err; // Re-throw for ChatThread to handle
    }
  };

  /* Mark chat read */
  const markChatRead = async (donationId) => {
    if (!donationId || !currentUserId || readCache.has(donationId)) return;

    const hasUnread = channels.some(msg => 
      msg.donationid === donationId && 
      msg.senderid !== currentUserId && 
      !msg.readreceipts
    );
    if (!hasUnread) return;

    readCache.add(donationId);
    setChannels(prev => prev.map(msg => 
      msg.donationid === donationId && msg.senderid !== currentUserId 
        ? { ...msg, readreceipts: true } 
        : msg
    ));

    try {
      await markChatReadService(donationId, currentUserId);
      if (socket) socket.emit('messageRead', { donationId, senderId: currentUserId });
    } catch (err) {
      console.error('markChatRead backend error:', err);
    }
  };

  /* Mark chat delivered */
  const markDelivered = async (donationId) => {
    if (!donationId || !currentUserId) return;
    
    setChannels(prev => prev.map(msg => 
      msg.donationid === donationId && msg.senderid !== currentUserId 
        ? { ...msg, delivered: true } 
        : msg
    ));

    try {
      const result = await markDeliveredService(donationId, currentUserId);
      if (socket) socket.emit('messageDelivered', { donationId, userId: currentUserId });
      return result;
    } catch (err) {
      console.error('markDelivered backend error:', err);
    }
  };

  /* Delete user chat */
  const deleteUserChat = async (donationId) => {
    if (!donationId || !currentUserId) return;

    try {
      const result = await deleteUserChatService(donationId, currentUserId);

      if (result?.updated) {
        setChannels(prev => prev.filter(msg => msg.donationid !== donationId));
      }

      if (result?.donationDeleted) {
        console.log(`Donation ${donationId} status updated to deleted.`);
      }

      return result;
    } catch (err) {
      console.error('deleteUserChat backend error:', err);
      throw err;
    }
  };

  /* Unread count helper - for specific donation */
  const getUnreadCount = (donationId) => {
    if (!currentUserId) return 0;
    return channels.filter(msg => 
      msg.donationid === donationId && 
      msg.senderid !== currentUserId && 
      !msg.readreceipts && 
      msg.delivered
    ).length;
  };

  /* Total unread count - for all chats (used in App.js badge) */
  const getTotalUnreadCount = () => {
    if (!currentUserId) return 0;
    // Backend already filters deleted messages, so channels only has active chats
    return channels.filter(msg => 
      msg.senderid !== currentUserId && // Incoming message
      !msg.readreceipts                  // Unread
    ).length;
  };

  /* Check if chat is blocked for current user */
  const isChatBlocked = (donationId) => {
    if (!currentUserId) return false;
    return channels.some(msg => 
      msg.donationid === donationId && 
      (msg.deleted_by || []).includes(currentUserId)
    );
  };

  /* Get detailed chat block status from database (works even with no messages) */
  const getChatBlockStatus = async (donationId) => {
    if (!donationId || !currentUserId) {
      return { isBlocked: false, blockReason: null };
    }
    
    try {
      const result = await getChatBlockStatusService(donationId, currentUserId);
      return result;
    } catch (err) {
      console.error('getChatBlockStatus error:', err);
      return { isBlocked: false, blockReason: null };
    }
  };

  /* Typing indicator functions */
  const emitTyping = (donationId, userName) => {
    if (!socket || !donationId || !currentUserId) return;
    socket.emit('typing', { donationId, userId: currentUserId, userName });
  };

  const emitStoppedTyping = (donationId) => {
    if (!socket || !donationId || !currentUserId) return;
    socket.emit('stoppedTyping', { donationId, userId: currentUserId });
  };

  const getTypingUser = (donationId) => {
    const typingInfo = typingUsers.get(donationId);
    // Don't show typing if it's the current user
    if (typingInfo && typingInfo.userId !== currentUserId) {
      return typingInfo.userName;
    }
    return null;
  };

  return (
    <ChatContext.Provider value={{
      channels,
      setChannels,
      markChatRead,
      markDelivered,
      addMessage,
      deleteUserChat,
      getUnreadCount,
      getTotalUnreadCount, // NEW: Total unread count for badge
      isChatBlocked, // Helper function based on channels (fast)
      getChatBlockStatus, // API call for accurate status (works with no messages)
      currentUserEmail,
      currentUserId,
      socket,
      onlineUsers, // This Set is updated via WebSocket
      emitTyping, // Function to emit typing event
      emitStoppedTyping, // Function to emit stopped typing event
      getTypingUser, // Function to get typing user name for a donation
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;