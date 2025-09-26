import React, {useState, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatContext from './ChatContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ChatList.css';

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added ChatList component
   Description: Displays the list of all chats for the current user and handles navigation to ChatThread
*/
export default function ChatList() {
  const navigate = useNavigate();
  const { channels, setChannels, markChatRead, currentUserEmail, currentUserId } = useContext(ChatContext);
  const prevUnreadRef = useRef(0);
 //Added for navbar unread count
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Removed duplicate polling (now relies on ChatContext)
     Description: ChatList now consumes chats directly from ChatContext instead of fetching independently
  */
  useEffect(() => {
    // No need to fetch here; ChatContext handles polling + decryption
  }, [currentUserEmail]);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Grouped messages by donationId
     Description: Groups all chat messages by their donation for display
  */
  const donationChats = useMemo(() => {
    const grouped = Object.values(
      channels.reduce((acc, msg) => {
        if (!acc[msg.donationid]) {
          const otherMsg = channels.find(
            m => m.donationid === msg.donationid && m.senderid !== currentUserId
          );

          let otherParticipantName = '';
          let avatarEmoji = '🍏';

          if (otherMsg) {
            otherParticipantName = otherMsg.senderName || otherMsg.charityName || 'Unknown';
            avatarEmoji = otherMsg.icon || '🍏';
          } else {
            otherParticipantName = msg.charityName || 'Unknown';
            avatarEmoji = msg.icon || '🍏';
          }

          acc[msg.donationid] = {
            donationid: msg.donationid,
            messages: [],
            participantName: otherParticipantName,
            avatarEmoji: avatarEmoji,
          };
        }

        acc[msg.donationid].messages.push(msg);
        return acc;
      }, {})
    );

    return grouped;
  }, [channels, currentUserId]);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Sorted chats by most recent message
     Description: Orders the grouped chats so the most recent messages appear first
  */
  const sortedChannels = useMemo(() => {
    return donationChats.sort((a, b) => {
      const aTime = a.messages[a.messages.length - 1]?.message_timestamp
        ? new Date(a.messages[a.messages.length - 1].message_timestamp)
        : new Date(0);
      const bTime = b.messages[b.messages.length - 1]?.message_timestamp
        ? new Date(b.messages[b.messages.length - 1].message_timestamp)
        : new Date(0);
      return bTime - aTime;
    });
  }, [donationChats]);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Added unread message toast
     Description: Displays a notification toast when new unread messages are received
  */
  useEffect(() => {
    // Only count non-empty messages
    const totalUnread = channels.filter(
      m =>
      !m.readreceipts &&
      m.senderid !== currentUserId &&
      (
        (m.chathistory && m.chathistory.trim() && m.chathistory.trim() !== 'Start a conversation...') ||
        (m.decryptedText && m.decryptedText.trim() && m.decryptedText.trim() !== 'Start a conversation...')
      )
    ).length;

    if (totalUnread > prevUnreadRef.current) {
      const newMessages = totalUnread - prevUnreadRef.current;
      // Update navbar badge
      setUnreadMessagesCount(newMessages);
      if (newMessages > 0){
        toast.info(`📩 You have ${newMessages} new unread message${newMessages > 1 ? 's' : ''}`);
      }
    }
    
    prevUnreadRef.current = totalUnread;
  }, [channels, currentUserId]);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Added chat opening logic
     Description: Marks messages as read and navigates to the ChatThread for the selected donation
  */
  const handleOpenChat = async (donationId, participantName, avatarEmoji) => {
    setChannels(prev =>
      prev.map(msg =>
        msg.donationid === donationId && msg.senderid !== currentUserId
          ? { ...msg, readreceipts: true }
          : msg
      )
    );

    await markChatRead(donationId);

    navigate(`/chats/${donationId}`, {
      state: { participantName, avatarEmoji }
    });
  };

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Added render
     Description: Renders the chat list page including chat previews, unread counts, and toast container
  */
  return (
    <div className="chat-page">
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar closeOnClick pauseOnHover />
      <div className="chat-header">
        <button className="back-button" onClick={() => navigate('/communication')}>← Back</button>
        <h2>My Chats ({currentUserEmail})</h2>
      </div>

      {(!currentUserEmail || !currentUserId) ? (
        <p>Loading chats...</p>
      ) : sortedChannels.length === 0 ? (
        <p>No chats found for {currentUserEmail}.</p>
      ) : (
        <div className="chat-list">
          {sortedChannels.map(channel => {
            // Take the last sent message in the messages array
            const lastMsg = channel.messages[channel.messages.length - 1];

            // Only show 'Start a conversation...' if the last message is empty
            const lastMessage = (lastMsg?.chathistory?.trim() || lastMsg?.decryptedText?.trim()) || 'Start a conversation...';

            // Only count non-empty unread messages
            const unreadCount = channel.messages.filter(
                m => !m.readreceipts && m.senderid !== currentUserId &&
                  (
                   (m.chathistory && m.chathistory.trim()) ||
                    (m.decryptedText && m.decryptedText.trim())
                    )
            ).length;

            return (
              <div
                key={channel.donationid}
                className="chat-preview"
                onClick={() => handleOpenChat(channel.donationid, channel.participantName, channel.avatarEmoji)}
              >
                <div className="chat-avatar">{channel.avatarEmoji}</div>
                <div className="chat-info">
                  <div className="chat-name">
                    {channel.participantName}
                    <span className="dot">·</span>
                    <span className="donation-id">Donation #{channel.donationid}</span>
                  </div>
                  <div className="chat-last-message">{lastMessage}</div>
                </div>
                {unreadCount > 0 && <div className="unread-count">{unreadCount}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
