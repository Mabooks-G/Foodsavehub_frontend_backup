// src/communication/Communication.js
import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import './communication.css';
import ChatContext, { ChatProvider } from './Components/ChatContext';

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Integrated chat access gating
   Description: Fetches user chats and controls access to chat features
*/
function CommunicationContent() {
  const { currentUserEmail, currentUserId } = useContext(ChatContext);
  const [canAccessChats, setCanAccessChats] = useState(false);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Added chat initialization with Supabase
     Description: On mount, fetches user chats and checks if user has approved donations
  */
  const API_BACKEND = process.env.REACT_APP_API_BACKEND;
  useEffect(() => {
    if (!currentUserEmail) {
      console.warn('No currentUserEmail yet in ChatContext');
      return;
    }

    async function initUserChats() {
      try {
        console.log('Fetching user chats for', currentUserEmail);

        const res = await fetch(`${API_BACKEND}/supabase/getUserChats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: currentUserEmail, since: '1970-01-01T00:00:00Z' }),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error('Fetch failed with status', res.status, text);
          return;
        }

        const chats = await res.json();
        console.log('User chats fetched:', chats);

        const hasApprovedDonation = Array.isArray(chats) && chats.length > 0;
        setCanAccessChats(hasApprovedDonation);
      } catch (err) {
        console.error('Error initializing user chats:', err);
      }
    }

    initUserChats();
  }, [currentUserEmail]);

  /* Author: Lethabo Mazui
     Event: Sprint 1
     LatestUpdate: Added ChatContext logging
     Description: Logs when the currentUserId is available in ChatContext
  */
  useEffect(() => {
    if (currentUserId) {
      console.log('currentUserId is now set in ChatContext:', currentUserId);
    }
  }, [currentUserId]);

  return (
    <div className="communication-container">
      <h1>Communications Hub</h1>
      <p>Connect with other FoodSave users through our secure messaging system.</p>

      <div className="communication-options">
        {canAccessChats ? (
          <Link to="/chatlist" className="chat-link">
            <div className="option-card">
              <h2>My Chats</h2>
              <p>View and manage your conversations with other users</p>
            </div>
          </Link>
        ) : (
          <div className="option-card disabled">
            <h2>My Chats</h2>
            <p>No approved donations yet. You need at least one approved donation to access chats.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Wrapped CommunicationContent in ChatProvider
   Description: Provides ChatContext to the communication hub
*/
export default function Communication({ currentUser }) {
  return (
    <ChatProvider currentUserEmail={currentUser?.email}>
      <CommunicationContent />
    </ChatProvider>
  );
}
