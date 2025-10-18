import React, { createContext, useState, useEffect } from 'react';
import {
  getStakeholderId,
  getUserChats,
  markChatRead as markChatReadService,
  updateChatHistory,
  markDelivered as markDeliveredService
} from '../services/chatServices';
import { io } from 'socket.io-client';

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Created ChatContext
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
  console.log('Attempting to decrypt message:', msg.chatid);

  if (!msg.chathistory || !msg.donationid) {
    console.log('Missing required fields for decryption');
    return { ...msg, chathistory: "" };
  }

  try {
    // Derive AES-GCM key
    const key = await deriveKey(msg.donationid);
    console.log('Key derived for donation:', msg.donationid);

    // Use cached IV if available, otherwise fallback (cannot reconstruct!)
    let ivB64;
    if (msg.iv) {
      ivB64 = msg.iv;
    } else if (ivCache.has(msg.chatid)) {
      ivB64 = ivCache.get(msg.chatid);
    } else {
      console.warn(`IV missing for chat ${msg.chatid}, cannot decrypt`);
      return { ...msg, chathistory: "[decryption error]" };
    }

    const rawCipher = base64ToBuf(msg.chathistory);
    const rawIv = base64ToBuf(ivB64);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: rawIv },
      key,
      rawCipher
    );

    const decryptedText = new TextDecoder().decode(decrypted);
    console.log('Successfully decrypted:', decryptedText);

    return { ...msg, chathistory: decryptedText };

  } catch (err) {
    console.error(` Failed to decrypt message ${msg.chatid}:`, err);
    return { ...msg, chathistory: "[decryption error]" };
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
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const readCache = new Set();

  /* Author: Lethabo Mazui
     LatestUpdate: Fetch stakeholderId
     Description: Determines current userId if not already set
  */
  useEffect(() => {
    if (!currentUserEmail || currentUserId) return;
    (async () => {
      try {
        const response = await getStakeholderId(currentUserEmail);
        if (!response?.stakeholderid) return;
        setCurrentUserId(response.stakeholderid);
      } catch (err) {
        console.error(' Error fetching stakeholderId:', err);
      }
    })();
  }, [currentUserEmail, currentUserId]);

  /* Author: Lethabo Mazui
     LatestUpdate: WebSocket connection
     Description: Sets up socket.io for real-time messages and online status tracking
  */
  useEffect(() => {
    if (!currentUserId) return;
    
    // Use the same backend URL as your API calls
    const backendUrl = process.env.REACT_APP_API_BACKEND || 'https://foodsave-backend-tdwp.onrender.com';
    
    console.log('Connecting to WebSocket:', backendUrl);
    
    const newSocket = io(backendUrl, { 
      query: { userId: currentUserId },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    setSocket(newSocket);

    // Handle connection events
    newSocket.on('connect', () => {
      console.log('WebSocket: Connected to server successfully');
      setIsSocketConnected(true);
      newSocket.emit('joinUser', { userId: currentUserId });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('WebSocket: Disconnected from server:', reason);
      setIsSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket: Connection error:', error);
      setIsSocketConnected(false);
    });

    // Handle new messages from other users
    newSocket.on('newMessage', async (msg) => {
      console.log('WebSocket: New message received', msg);
      
      // Only process if this message is not from ourselves
      if (msg.senderid !== currentUserId) {
        try {
          const decrypted = await decryptMessage(msg);
          setChannels(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(m => m.chatid === msg.chatid);
            if (!exists) {
              console.log('Adding new message to channels:', decrypted);
              return [...prev, decrypted];
            }
            console.log('Message already exists, skipping:', msg.chatid);
            return prev;
          });
        } catch (error) {
          console.error('Error processing new message:', error);
        }
      }
    });

    // Handle message delivered receipts
    newSocket.on('messageDelivered', ({ donationid, userId }) => {
      console.log('WebSocket: Message delivered for donation', donationid);
      setChannels(prev => prev.map(msg => 
        msg.donationid === donationid && msg.senderid !== userId 
          ? { ...msg, delivered: true } 
          : msg
      ));
    });

    // Handle message read receipts
    newSocket.on('messageRead', ({ donationid, senderId }) => {
      console.log('WebSocket: Message read for donation', donationid);
      setChannels(prev => prev.map(msg => 
        msg.donationid === donationid && msg.senderid !== senderId 
          ? { ...msg, readreceipts: true } 
          : msg
      ));
    });

    // Handle online users updates
    newSocket.on('onlineUsers', (onlineIds) => {
      console.log('WebSocket: Online users updated', onlineIds);
      setOnlineUsers(new Set(onlineIds));
    });

    newSocket.on('userConnected', (userId) => {
      console.log('WebSocket: User connected', userId);
      setOnlineUsers(prev => new Set(prev).add(userId));
    });

    newSocket.on('userDisconnected', (userId) => {
      console.log('WebSocket: User disconnected', userId);
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    return () => {
      console.log('WebSocket: Cleaning up connection');
      newSocket.disconnect();
      // Remove all event listeners
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('newMessage');
      newSocket.off('messageDelivered');
      newSocket.off('messageRead');
      newSocket.off('onlineUsers');
      newSocket.off('userConnected');
      newSocket.off('userDisconnected');
    };
  }, [currentUserId]);

  /* Author: Lethabo Mazui
     LatestUpdate: Polling getUserChats
     Description: Periodically fetches user chats and decrypts messages
  */
  useEffect(() => {
    if (!currentUserEmail || !currentUserId) return;

    const fetchChats = async () => {
      try {
        const data = await getUserChats(currentUserEmail);
        if (!data?.length) return;

        // Attach IV from ivCache if missing
        const dataWithIv = data.map(msg => {
          if (!msg.iv && ivCache.has(msg.chatid)) {
            return { ...msg, iv: ivCache.get(msg.chatid) };
          }
          return msg;
        });

        const decryptedData = await Promise.all(dataWithIv.map(decryptMessage));

        setChannels(prev => {
          const existingIds = prev.map(m => m.chatid);
          const newMessages = decryptedData.filter(m => !existingIds.includes(m.chatid));
          if (newMessages.length > 0) {
            console.log('Polling: Adding new messages:', newMessages.length);
            return [...prev, ...newMessages];
          }
          return prev;
        });
      } catch (err) {
        console.error(' Polling getUserChats error:', err);
      }
    };

    fetchChats();
    const intervalId = setInterval(fetchChats, 5000);
    return () => clearInterval(intervalId);
  }, [currentUserEmail, currentUserId]);

  /* Author: Lethabo Mazui
     LatestUpdate: Add new message
     Description: Encrypts, sends, stores locally, and emits via socket
  */
  const addMessage = async (senderId, text, donationId, message_timestamp) => {
    if (!donationId || !senderId || !text.trim()) return;

    try {
      console.log('Sending message:', { senderId, text, donationId });

      // 1. Derive key first
      const key = await deriveKey(donationId);

      // 2. Encrypt message (ciphertext + iv)
      const { ciphertextB64, ivB64 } = await encryptWithKey(key, text);

      // 3. Create temporary local message (shows instantly in UI)
      const localMessage = {
        chatid: `temp-${Date.now()}`,
        donationid: donationId,
        senderid: senderId,
        chathistory: text,   // plain text for local display
        iv: ivB64,           // include generated IV immediately
        message_timestamp,
        readreceipts: false,
        delivered: false
      };

      // 4. Cache the IV for this chatid
      ivCache.set(localMessage.chatid, ivB64);

      // 5. Add localMessage to UI immediately
      setChannels(prev => [...prev, localMessage]);

      // 6. Save encrypted message to backend
      const saved = await updateChatHistory(
        donationId,
        senderId,
        ciphertextB64,
        ivB64,
        message_timestamp
      );

      // 7. Attach iv (in case backend doesn't return it)
      const savedWithIv = { ...saved, iv: ivB64 };

      // 8. Decrypt server version (so local temp msg is replaced)
      const decryptedText = await decryptMessage(savedWithIv);

      setChannels(prev =>
        prev.map(msg =>
          msg.chatid === localMessage.chatid ? decryptedText : msg
        )
      );

      // 9. Emit to socket for real-time delivery to other users
      if (socket && isSocketConnected) {
        console.log('Emitting newMessage via WebSocket:', savedWithIv);
        socket.emit('newMessage', savedWithIv);
      } else {
        console.warn('WebSocket not connected, message will not be delivered in real-time');
      }

    } catch (err) {
      console.error(' addMessage backend error:', err);
    }
  };

  /* Author: Lethabo Mazui
     LatestUpdate: Mark chat read
     Description: Marks all messages for a donation as read locally and via backend
  */
  const markChatRead = async (donationId) => {
    if (!donationId || !currentUserId || readCache.has(donationId)) return;

    const hasUnread = channels.some(msg => msg.donationid === donationId && msg.senderid !== currentUserId && !msg.readreceipts);
    if (!hasUnread) return;

    readCache.add(donationId);
    setChannels(prev => prev.map(msg => msg.donationid === donationId && msg.senderid !== currentUserId ? { ...msg, readreceipts: true } : msg));

    try {
      await markChatReadService(donationId, currentUserId);
      if (socket && isSocketConnected) {
        console.log('Emitting messageRead via WebSocket:', { donationId, senderId: currentUserId });
        socket.emit('messageRead', { donationId, senderId: currentUserId });
      }
    } catch (err) {
      console.error(' markChatRead backend error:', err);
    }
  };

  /* Author: Lethabo Mazui
     LatestUpdate: Mark chat delivered
     Description: Marks all messages for a donation as delivered locally and via backend
  */
  const markDelivered = async (donationId) => {
    if (!donationId || !currentUserId) return;
    setChannels(prev => prev.map(msg => msg.donationid === donationId && msg.senderid !== currentUserId ? { ...msg, delivered: true } : msg));
    try {
      const result = await markDeliveredService(donationId, currentUserId);
      if (socket && isSocketConnected) {
        console.log('Emitting messageDelivered via WebSocket:', { donationId, userId: currentUserId });
        socket.emit('messageDelivered', { donationId, userId: currentUserId });
      }
      return result;
    } catch (err) {
      console.error(' markDelivered backend error:', err);
    }
  };

  /* Author: Lethabo Mazui
     LatestUpdate: Unread count helper
     Description: Returns number of unread messages for a donation
  */
  const getUnreadCount = (donationId) => {
    if (!currentUserId) return 0;
    return channels.filter(msg => msg.donationid === donationId && msg.senderid !== currentUserId && !msg.readreceipts && msg.delivered).length;
  };

  return (
    <ChatContext.Provider value={{
      channels,
      setChannels,
      markChatRead,
      markDelivered,
      addMessage,
      getUnreadCount,
      currentUserEmail,
      currentUserId,
      socket,
      onlineUsers,
      isSocketConnected
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;