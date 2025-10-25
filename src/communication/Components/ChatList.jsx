import React, {useState, useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatContext from './ChatContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ChatList.css';

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added delete functionality with inline confirmation modal
   Description: Displays the list of all chats for the current user and handles navigation to ChatThread
*/
export default function ChatList() {
  const navigate = useNavigate();
  const { channels, setChannels, markChatRead, deleteUserChat, currentUserEmail, currentUserId } = useContext(ChatContext);
  const prevUnreadRef = useRef(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // State for delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // No need to fetch here; ChatContext handles polling + decryption
  }, [currentUserEmail]);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Grouped messages by donationId - backend already filters deleted chats
     Description: Groups all chat messages by their donation for display. Backend filters out deleted messages, so we just group what's left.
  */
const donationChats = useMemo(() => {
  // Backend already filters out messages deleted by current user (deleted_by array check)
  // So channels only contains messages from active (non-deleted) chats
  // We just need to group them by donation
  
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

  // Sort messages within each donation by timestamp
  grouped.forEach(group => {
    group.messages.sort((a, b) => new Date(a.message_timestamp) - new Date(b.message_timestamp));
  });

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
     LatestUpdate: Added unread message toast - backend already filters deleted chats
     Description: Displays a notification toast when new unread messages are received. Backend filters deleted messages, so we just check unread/incoming status.
  */
  useEffect(() => {
    // Backend already filtered out deleted messages (getUserChats excludes deleted_by)
    // So channels only contains active messages
    const totalUnread = channels.filter(
      m => {
        // Must be unread
        const isUnread = !m.readreceipts;
        // Must be from someone else (incoming message)
        const isIncoming = m.senderid !== currentUserId;
        // Must have actual content (not placeholder)
        const hasContent = (m.chathistory && m.chathistory.trim() && m.chathistory.trim() !== 'Start a conversation...') ||
                          (m.decryptedText && m.decryptedText.trim() && m.decryptedText.trim() !== 'Start a conversation...');
        
        return isUnread && isIncoming && hasContent;
      }
    ).length;

    if (totalUnread > prevUnreadRef.current) {
      const newMessages = totalUnread - prevUnreadRef.current;
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

  /* Author: Assistant
     LatestUpdate: Added delete chat handler
     Description: Opens confirmation modal for chat deletion
  */
  const handleDeleteClick = (e, channel) => {
    e.stopPropagation(); // Prevent opening the chat
    setChatToDelete(channel);
    setDeleteModalOpen(true);
  };

  /* Author: Assistant
     LatestUpdate: Added delete confirmation handler
     Description: Handles the actual deletion after user confirms
  */
  const handleConfirmDelete = async () => {
    if (!chatToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteUserChat(chatToDelete.donationid);
      
      toast.success(`Chat with ${chatToDelete.participantName} deleted successfully`);
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setChatToDelete(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  /* Author: Assistant
     LatestUpdate: Added modal close handler
     Description: Closes the delete confirmation modal
  */
  const handleCloseModal = () => {
    if (!isDeleting) {
      setDeleteModalOpen(false);
      setChatToDelete(null);
    }
  };

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Added delete button and inline modal
     Description: Renders the chat list page including chat previews, unread counts, delete buttons, and confirmation modal
  */
  return (
    <div className="chat-page">
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar closeOnClick pauseOnHover />
      
      {/* Inline Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Chat</h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            
            <div className="modal-body">
              <p>Are you sure you want to delete your conversation with <span className="participant-name">{chatToDelete?.participantName}</span>?</p>
              <p className="donation-id-text">Donation #{chatToDelete?.donationid}</p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            
            <div className="modal-footer">
          <button 
          className="modal-btn cancel-btn" 
          onClick={handleCloseModal}
          disabled={isDeleting}
          >
          Cancel
        </button>
        <button 
        className="modal-btn delete-btn" 
        onClick={handleConfirmDelete}
        disabled={isDeleting}
          >
          {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            const lastMsg = channel.messages[channel.messages.length - 1];
            // Prefer decryptedText over chathistory for display
            const lastMessageText = lastMsg?.decryptedText?.trim() || lastMsg?.chathistory?.trim() || '';
            const lastMessage = lastMessageText || 'Start a conversation...';
            
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
                <div className="chat-actions">
                  {unreadCount > 0 && <div className="unread-count">{unreadCount}</div>}
                  <button
                    className="delete-chat-btn"
                    onClick={(e) => handleDeleteClick(e, channel)}
                    aria-label="Delete chat"
                    title="Delete chat"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}