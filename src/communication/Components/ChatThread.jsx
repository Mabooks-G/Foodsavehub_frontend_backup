import React, { useEffect, useState, useContext, useRef } from "react"; 
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChatContext from "./ChatContext";
import "./ChatThread.css";

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Auto scroll + manual scroll button with unread messages count
   Description: Handles display and interaction for a single chat conversation
*/
export default function ChatThread() {
  const { donationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { channels, markChatRead, markDelivered, currentUserId, addMessage } = useContext(ChatContext);

  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(location.state?.avatarEmoji || "🍏");
  const [otherParticipant, setOtherParticipant] = useState(location.state?.participantName || "User");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesWrapperRef = useRef(null);
  const currentYear = new Date().getFullYear();

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

  // Load messages and mark read/delivered
  useEffect(() => {
    if (!donationId || !channels) return;

    const donationMessages = channels
      .filter(m => m.donationid === donationId)
      .filter(m => (m.chathistory && m.chathistory.trim()) || (m.decryptedText && m.decryptedText.trim()))
      .map(m => {
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
          decryptedText: null
        };
      });

    setMessages(donationMessages);

    const otherMsg = donationMessages.find(m => m.senderid !== currentUserId);
    if (otherMsg) {
      setOtherParticipant(otherMsg.senderName || otherMsg.charityName || "User");
      setAvatarEmoji(otherMsg.icon || "🍏");
    }

    if (donationMessages.length > 0) {
      markChatRead(donationId);
      const hasUndelivered = donationMessages.some(m => !m.delivered && m.senderid !== currentUserId);
      if (hasUndelivered) markDelivered(donationId);
    }

    // Count unread messages for scroll button
    const unread = donationMessages.filter(m => !m.readreceipts && m.senderid !== currentUserId).length;
    setUnreadMessagesCount(unread);
    setShowScrollButton(unread > 0);

    // Automatically scroll to bottom on chat open
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  }, [donationId, channels, markChatRead, markDelivered, currentUserId]);

  // Scroll to bottom when sending a message
  useEffect(() => {
    const wrapper = messagesWrapperRef.current;
    if (!wrapper) return;
    const handleScroll = () => {
      const atBottom = wrapper.scrollHeight - wrapper.scrollTop === wrapper.clientHeight;
      if (atBottom) setShowScrollButton(false);
    };
    wrapper.addEventListener("scroll", handleScroll);
    return () => wrapper.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollButton(false);
    setUnreadMessagesCount(0);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const timestampUTC = new Date().toISOString();
    addMessage(currentUserId, inputValue.trim(), donationId, timestampUTC);
    setInputValue("");
    // Scroll immediately when sending
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
            {!isSent && <div className="avatar">{msg.avatarEmoji}</div>}
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
          <div className="user-subtitle" style={{ fontSize: "0.8rem", color: "grey" }}>
            • Donation #{donationId}
          </div>
        </div>
      </div>

      <div className="messages-wrapper" ref={messagesWrapperRef} style={{ overflowY: "auto", flex: 1, padding: "1rem" }}>
        {renderMessages()}
        {typing && (
          <div className="message-row received">
            <div className="message-bubble typing"><span></span><span></span><span></span></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button className="scroll-to-bottom-btn" onClick={handleScrollToBottom}>
          ↓ {unreadMessagesCount > 0 && <span className="unread-count-badge">{unreadMessagesCount}</span>}
        </button>
      )}

      <div className="message-input-container">
        <textarea
          placeholder="Type a message..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          rows={1}
        />
        <button className="send-button" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
