import React, { useEffect, useState, useContext, useRef } from "react";  
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChatContext from "./ChatContext";
import "./ChatThread.css";

export default function ChatThread() {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    channels, 
    markChatRead, 
    markDelivered, 
    currentUserId,
    currentUserEmail,
    addMessage, 
    onlineUsers, 
    socket, 
    getChatBlockStatus,
    emitTyping,
    emitStoppedTyping,
    getTypingUser
  } = useContext(ChatContext);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(location.state?.avatarEmoji || "🍏");
  const [otherParticipant, setOtherParticipant] = useState(location.state?.participantName || "User");
  const [otherParticipantId, setOtherParticipantId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isChatBlocked, setIsChatBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesWrapperRef = useRef(null);
  const textareaRef = useRef(null);
  const isInitialLoad = useRef(true);
  const typingTimeoutRef = useRef(null);
  const currentYear = new Date().getFullYear();

  // Common emoji categories
  const emojis = {
    smileys: ['😀','😃','😄','😁','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓'],
    gestures: ['👍','👎','👌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤝','🙏','💪'],
    hearts: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🥦','🥒','🌶️','🌽','🥕','🥔','🍠','🥐','🍞','🥖','🧀','🥚','🍳','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🥪','🌮','🌯','🥗','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🍤','🍙','🍚','🍘','🥠','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪'],
  };

  // Robust timestamp parsing
  const parseMessageTimestamp = (ts) => {
    if (!ts) return new Date();
    let date;
    try {
      date = new Date(ts.includes("T") ? ts : ts.replace(" ", "T") + "Z");
      if (isNaN(date.getTime())) throw new Error("Invalid date");
    } catch {
      date = new Date();
    }
    return date;
  };

  const applyOffset = (date, hours = 2) => new Date(date.getTime() + hours * 60 * 60 * 1000);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 192);
    textarea.style.height = `${newHeight}px`;
  }, [inputValue]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showEmojiPicker && !e.target.closest('.emoji-picker-container') && !e.target.closest('.emoji-button')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // FIXED: Online status - compare strings to strings
  const isOtherUserOnline = otherParticipantId ? onlineUsers.has(String(otherParticipantId)) : false;

  // Debug online status
  useEffect(() => {
    if (otherParticipantId) {
      console.log(`[ChatThread] Online status check:`, {
        otherParticipantId: String(otherParticipantId),
        onlineUsersArray: Array.from(onlineUsers),
        isOnline: onlineUsers.has(String(otherParticipantId))
      });
    }
  }, [otherParticipantId, onlineUsers]);

  // Silent block check on mount
  useEffect(() => {
    if (!donationId || !currentUserId || !getChatBlockStatus) return;

    const silentBlockCheck = async () => {
      try {
        const blockStatus = await getChatBlockStatus(donationId);
        
        if (blockStatus.isBlocked) {
          setIsChatBlocked(true);
          setBlockReason(blockStatus.blockReason || "This chat is blocked");
        } else {
          setIsChatBlocked(false);
          setBlockReason("");
        }
        
        if (blockStatus.otherParticipantId) {
          setOtherParticipantId(blockStatus.otherParticipantId);
        }
      } catch (error) {
        console.error('[ChatThread] Block check failed:', error);
        setIsChatBlocked(false);
        setBlockReason("");
      }
    };

    silentBlockCheck();
  }, [donationId, currentUserId, getChatBlockStatus]);

  // Join donation room
  useEffect(() => {
    if (!socket || !donationId || !currentUserId) return;

    console.log(`[ChatThread] Joining donation room: donation-${donationId}`);
    socket.emit('joinDonationRoom', { donationId, userId: currentUserId });

    return () => {
      console.log(`[ChatThread] Leaving donation room: donation-${donationId}`);
    };
  }, [socket, donationId, currentUserId]);

  // Load messages and participant info
  useEffect(() => {
    if (!donationId || !channels || !currentUserId) return;

    const donationMessages = channels
      .filter(m => m.donationid === donationId)
      .filter(m => (m.chathistory && m.chathistory.trim()) || (m.decryptedText && m.decryptedText.trim()))
      .map(m => {
        // If display props already exist, use them
        if (m.localTime && m.localDate && m.formattedDate && m.displayTimestamp) {
          return {
            ...m,
            decryptedText: m.decryptedText || m.chathistory || null,
          };
        }

        // Otherwise compute them
        const msgDateUTC = parseMessageTimestamp(m.message_timestamp);
        const msgDate = applyOffset(msgDateUTC, 2); 
        const showYear = msgDate.getFullYear() !== currentYear;
        const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
          day: "numeric",
          month: "long",
          year: showYear ? "numeric" : undefined,
        });

        return {
          ...m,
          displayTimestamp: msgDate.getTime(),
          localTime: msgDate.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
          localDate: msgDate.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" }),
          formattedDate: dateFormatter.format(msgDate),
          decryptedText: m.decryptedText || m.chathistory || null,
        };
      });

    setMessages(donationMessages);

    // Get other participant info
    const otherMsg = donationMessages.find(m => m.senderid !== currentUserId);
    if (otherMsg) {
      setOtherParticipant(otherMsg.senderName || otherMsg.charityName || "User");
      if (!otherParticipantId) {
        setOtherParticipantId(otherMsg.senderid);
      }
      setAvatarEmoji(otherMsg.icon || "🍏");
    }

    if (donationMessages.length > 0) {
      markChatRead(donationId);
      const hasUndelivered = donationMessages.some(m => !m.delivered && m.senderid !== currentUserId);
      if (hasUndelivered) markDelivered(donationId);
    }

    // Auto-scroll on first load
    if (isInitialLoad.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        isInitialLoad.current = false;
      }, 100);
    }
  }, [donationId, channels, markChatRead, markDelivered, currentUserId, otherParticipantId]);

  // Scroll detection
  useEffect(() => {
    const wrapper = messagesWrapperRef.current;
    if (!wrapper) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = wrapper;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottom = distanceFromBottom < 50;

      if (isAtBottom) {
        setShowScrollButton(false);
        setUnreadMessagesCount(0);
        setIsUserScrolling(false);
      } else {
        setIsUserScrolling(true);
        const unread = messages.filter(m => !m.readreceipts && m.senderid !== currentUserId).length;
        if (unread > 0) {
          setShowScrollButton(true);
          setUnreadMessagesCount(unread);
        }
      }
    };

    wrapper.addEventListener("scroll", handleScroll);
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, [messages, currentUserId]);

  // Auto-scroll new messages
  useEffect(() => {
    if (!isUserScrolling && messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } else if (isUserScrolling) {
      const unread = messages.filter(m => !m.readreceipts && m.senderid !== currentUserId).length;
      if (unread > 0) {
        setShowScrollButton(true);
        setUnreadMessagesCount(unread);
      }
    }
  }, [messages.length, isUserScrolling]);

  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
    setUnreadMessagesCount(0);
    setIsUserScrolling(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    if (isChatBlocked) {
      alert(blockReason || "This chat is blocked. You cannot send messages.");
      return;
    }

    // Store the message text before clearing
    const messageText = inputValue.trim();
    
    // IMMEDIATELY clear input and reset textarea height
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setIsUserScrolling(false);

    try {
      // Send message in background
      await addMessage(currentUserId, messageText, donationId);
      
      // Auto-scroll after message appears
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // If sending failed, restore the message text
      setInputValue(messageText);
      
      if (error.message?.includes('deleted this chat') || error.message?.includes('Cannot send message')) {
        setIsChatBlocked(true);
        
        if (error.message.includes('other user')) {
          setBlockReason("This user has deleted the chat. You can no longer send messages.");
        } else if (error.message.includes('You have deleted')) {
          setBlockReason("You have deleted this chat. Messages cannot be sent.");
        } else {
          setBlockReason("This chat is blocked. Messages cannot be sent.");
        }
        
        alert(error.message);
      }
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (!value.trim()) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      emitStoppedTyping(donationId);
      return;
    }

    // Emit typing indicator
    const currentUserName = currentUserEmail || "User";
    emitTyping(donationId, currentUserName);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitStoppedTyping(donationId);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        emitStoppedTyping(donationId);
      }
    };
  }, [donationId, emitStoppedTyping]);

  const handleEmojiClick = (emoji) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const renderMessages = () => {
    let lastDate = "";
    return messages.map(msg => {
      const showDate = lastDate !== msg.localDate;
      lastDate = msg.localDate;
      const isSent = msg.senderid === currentUserId;

      if (!(msg.decryptedText && msg.decryptedText.trim()) && !(msg.chathistory && msg.chathistory.trim())) return null;

      return (
        <React.Fragment key={msg.chatid + (msg.message_timestamp || new Date().toISOString())}>
          {showDate && <div className="date-bubble">{msg.formattedDate}</div>}
          <div className={`message-row ${isSent ? "sent" : "received"}`}>
            {!isSent && <div className="avatar">{avatarEmoji}</div>}
            <div className={`message-bubble ${msg.readreceipts && !isSent ? "read-green" : ""}`}>
              {msg.decryptedText || msg.chathistory}
              {isSent && (
                <span className={`read-receipt ${msg.readreceipts ? "read" : msg.delivered ? "delivered" : ""}`}>
                  {msg.delivered ? "✓✓" : "✓"}
                </span>
              )}
            </div>
            <div className="message-time">{msg.localTime}</div>
          </div>
        </React.Fragment>
      );
    });
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate("/chatlist")}>← Back</button>
        <div className="chat-header-avatar">{avatarEmoji}</div>
        <div className="user-info">
          <div className="user-name">{otherParticipant}</div>
          <div className="user-status">
            <span style={{ fontSize: "0.75rem", color: "#667eea", fontWeight: "600" }}>
              Donation #{donationId}
            </span>
          </div>
        </div>
      </div>

      {isChatBlocked && (
        <div className="chat-blocked-warning">
          ⚠️ {blockReason || "This chat is blocked"}
        </div>
      )}

      <div className="messages-wrapper" ref={messagesWrapperRef}>
        {renderMessages()}
        
        {/* Typing indicator */}
        {getTypingUser(donationId) && (
          <div className="message-row received">
            <div className="avatar">{avatarEmoji}</div>
            <div className="message-bubble typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button className="scroll-to-bottom-btn" onClick={handleScrollToBottom}>
          ↓ {unreadMessagesCount > 0 && <span className="unread-count-badge">{unreadMessagesCount}</span>}
        </button>
      )}

      <div className={`message-input-container ${isChatBlocked ? 'blocked' : ''}`}>
        <button
          className="emoji-button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={isChatBlocked}
          aria-label="Insert emoji"
        >
          😊
        </button>

        {showEmojiPicker && !isChatBlocked && (
          <div className="emoji-picker-container">
            <div className="emoji-picker">
              {Object.entries(emojis).map(([category, emojiList]) => (
                <div key={category} className="emoji-category">
                  <div className="emoji-category-title">{category}</div>
                  <div className="emoji-grid">
                    {emojiList.map((emoji, idx) => (
                      <button
                        key={idx}
                        className="emoji-item"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          placeholder={
            isChatBlocked 
              ? "Chat blocked - cannot send messages" 
              : "Type a message..."
          }
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          disabled={isChatBlocked}
        />
        <button 
          className="send-button" 
          onClick={handleSend}
          disabled={isChatBlocked || !inputValue.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}