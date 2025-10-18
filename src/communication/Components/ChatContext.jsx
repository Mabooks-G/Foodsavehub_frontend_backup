import React, { createContext, useState, useEffect } from 'react';
import {
  getStakeholderId,
  getUserChats,
  markChatRead as markChatReadService,
  updateChatHistory,
  markDelivered as markDeliveredService
} from '../services/chatServices';

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Created ChatContext
   Description: Provides context for chat state, encryption, websocket events, and helper functions
*/
const ChatContext = createContext();

// Encryption helper functions
const bufToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const base64ToBuf = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

// Derive encryption key from donationId
const deriveKey = async (donationId) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(donationId.padEnd(32, '0').slice(0, 32)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('foodsave-chat-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt message with derived key
const encryptWithKey = async (key, plaintext) => {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  
  return {
    ciphertextB64: bufToBase64(ciphertext),
    ivB64: bufToBase64(iv)
  };
};

// Decrypt message
const decryptMessage = async (msg) => {
  try {
    // If message is already decrypted or is empty, return as-is
    if (!msg.chathistory || msg.chathistory.trim() === '') {
      return {
        ...msg,
        decryptedText: msg.chathistory || ''
      };
    }

    // Try to decrypt if we have both ciphertext and IV
    if (msg.chathistory && msg.iv) {
      try {
        const key = await deriveKey(msg.donationid);
        const ciphertextBuf = base64ToBuf(msg.chathistory);
        const ivBuf = base64ToBuf(msg.iv);
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivBuf },
          key,
          ciphertextBuf
        );
        
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decrypted);
        
        return {
          ...msg,
          decryptedText
        };
      } catch (decryptError) {
        console.warn('Decryption failed, returning ciphertext:', decryptError);
        // If decryption fails, return the original ciphertext
        return {
          ...msg,
          decryptedText: msg.chathistory
        };
      }
    }
    
    // If no IV or not encrypted, return as-is
    return {
      ...msg,
      decryptedText: msg.chathistory
    };
  } catch (error) {
    console.error('Error in decryptMessage:', error);
    return {
      ...msg,
      decryptedText: msg.chathistory || '[Unable to decrypt message]'
    };
  }
};

// Create IV cache outside component
const ivCache = new Map();
const readCache = new Set();

export const ChatProvider = ({ children, currentUserEmail, currentUserId: initialUserId }) => {
  const [channels, setChannels] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(initialUserId || null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

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
     LatestUpdate: TEMPORARILY DISABLED WebSocket connection
     Description: Socket.IO disabled until backend is properly configured
  */
  useEffect(() => {
    if (!currentUserId) return;
    
    // TEMPORARILY DISABLE SOCKET.IO
    console.log('Socket.IO temporarily disabled - focus on WasteAnalytics');
    // Socket.IO code commented out for now
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
          return [...prev, ...newMessages];
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
     LatestUpdate: Add new message (without socket emission)
     Description: Encrypts, sends, stores locally - socket emission disabled
  */
  const addMessage = async (senderId, text, donationId, message_timestamp) => {
    if (!donationId || !senderId || !text.trim()) return;

    try {
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

      // 9. TEMPORARILY DISABLE socket emission
      // if (socket) socket.emit('newMessage', savedWithIv);

    } catch (err) {
      console.error(' addMessage backend error:', err);
    }
  };

  /* Author: Lethabo Mazui
     LatestUpdate: Mark chat read (without socket emission)
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
      // TEMPORARILY DISABLE socket emission
      // if (socket) socket.emit('messageRead', { donationId, senderId: currentUserId });
    } catch (err) {
      console.error(' markChatRead backend error:', err);
    }
  };

  /* Author: Lethabo Mazui
     LatestUpdate: Mark chat delivered (without socket emission)
     Description: Marks all messages for a donation as delivered locally and via backend
  */
  const markDelivered = async (donationId) => {
    if (!donationId || !currentUserId) return;
    setChannels(prev => prev.map(msg => msg.donationid === donationId && msg.senderid !== currentUserId ? { ...msg, delivered: true } : msg));
    try {
      const result = await markDeliveredService(donationId, currentUserId);
      // TEMPORARILY DISABLE socket emission
      // if (socket) socket.emit('messageDelivered', { donationId, userId: currentUserId });
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
      socket: null, // Set to null since socket is disabled
      onlineUsers: new Set() // Empty set since we're not tracking online users
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;