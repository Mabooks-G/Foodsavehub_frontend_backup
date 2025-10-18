/* Author: Gift Mabokela
   Event: Sprint 1
   LatestUpdate: 2025/09/20
   Description: Main application component with routing and authentication
*/
import React, { Component, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';

// Pages
import Login from './auth/LoginSignup';
import Home from './users/HomeUser';
import User from './users/User';
import Communication from './communication/Communication';
import Donations from './donation_coordination/Donations';
import Donor from './donation_coordination/donor';
import GroceryList from './donation_coordination/grocerylist';
import Recipes from './recipe/Recipe';
import Waste from './waste_analyses/WasteAnalyses';
import FoodManagement from './waste_analyses/FoodManagement';
import Notifications from './notifications/Notification';
import ExpiryManager from './expiry_manager/ExpiryManager';
import BulkUpload from './database/BulkUpload';

// Chat Components and Provider
import { ChatProvider, default as ChatContext } from './communication/Components/ChatContext';
import ChatList from './communication/Components/ChatList';
import ChatThread from './communication/Components/ChatThread';


// Import index.css
import './index.css';

const API_BACKEND = process.env.REACT_APP_API_BACKEND;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentUser: null,
      unreadCount: 0,
      donationsNotifications: 0, 
      refreshFlag: false,
      pushEnabled: false, //  new state for push notifications
      sidebarCollapsed: true, // Add mobile sidebar state
      isMobile: false // Add mobile detection
    };
  }

  /* Author: Bethlehem Shimelis
     Event: Sprint 1
     LatestUpdate: 2025/09/17
     Description: Handle user login and set current user state
  */
  handleLogin = (user) => {
    this.setState({ currentUser: user }, () => {
      this.fetchUnreadCount();
      this.fetchPendingDonations();
       this.fetchPushEnabled(); //  fetch pushEnabled after login
      this.unreadInterval = setInterval(this.fetchUnreadCount, 10000);
      this.pendingInterval = setInterval(this.fetchPendingDonations, 1000); // optional refresh
    });
  };

  componentDidMount() {
    // Detect mobile on mount and add resize listener
    this.checkMobile();
    window.addEventListener('resize', this.checkMobile);
    
    if (this.state.currentUser) {
      this.fetchUnreadCount();
      this.fetchPendingDonations();
      this.fetchPushEnabled(); // 🔹 fetch on mount too
      this.unreadInterval = setInterval(this.fetchUnreadCount, 10000);
      this.pendingInterval = setInterval(this.fetchPendingDonations, 1000); // optional refresh
    }
  }

  componentWillUnmount() {
    clearInterval(this.unreadInterval);
     clearInterval(this.pendingInterval);
    window.removeEventListener('resize', this.checkMobile);
  }

  /* Author: Mobile Detection
     Event: Sprint 2 Fix
     LatestUpdate: 2025/10/01
     Description: Detect mobile screen size for sidebar handling
  */
  checkMobile = () => {
    const isMobile = window.innerWidth <= 768;
    this.setState({ isMobile });
  };

  handleMarkNotificationRead = (id) => {
    this.setState(prev => ({
      unreadCount: Math.max(prev.unreadCount - 1, 0),
      refreshFlag: !prev.refreshFlag
    }));
  };

  componentDidUpdate(prevProps, prevState) {
    if (prevState.refreshFlag !== this.state.refreshFlag && this.state.currentUser) {
      this.fetchUnreadCount();
      this.fetchPendingDonations();
      this.fetchPushEnabled(); //  keep pushEnabled up to date
    }
  }

  handleLogout = () => {
    this.setState({ currentUser: null, unreadCount: 0 , donationsNotifications: 0, pushEnabled: false});
    clearInterval(this.unreadInterval);
    clearInterval(this.pendingInterval);
  };

   /* Author: Kemo Mokoena
     Event: Sprint 1
     LatestUpdate: 2025/09/17
     Description: Display expiry push notifications
  */

  fetchUnreadCount = async () => {
    if (!this.state.currentUser ) return; // disable if push disabled

    try {
      const res = await axios.get(
        `${API_BACKEND}/api/notifications`,
        { params: { email: this.state.currentUser.email } }
      );
      const unread = res.data.filter(n => !n.notificationRead).length;
      this.setState({ unreadCount: unread });
    } catch (err) {
      console.error("Failed to fetch unread notifications:", err);
    }
  };

   /* Author: Lethabo Mazui
     Event: Sprint 2
     LatestUpdate: Disable donation push notification if disabled via UI
     Description: Display donation push notifications
  */
  fetchPendingDonations = async () => {
    const email = this.state.currentUser?.email;
     if (!email || !this.state.pushEnabled) { // disable if push disabled
      console.log("[App] Push disabled or no current user email, skipping pending donations fetch");
      return;
    }

    try {
      console.log(`[App] Fetching pending donations for ${email}`);
      
      const res = await axios.get(`${API_BACKEND}/api/dandc_notifications/pending-count`, {
        params: { email },
      });
      console.log("[App] Pending donations response:", res.data);
      this.setState({ donationsNotifications: res.data.count || 0 });
    } catch (err) {
      console.error("[App] Failed to fetch pending donations:", err);
    }
  };

  /* Author: Lethabo Mazui
     Event: Sprint 2
     LatestUpdate: Writing the code up
     Description:Fetch pushEnabled state from backend
  */

  fetchPushEnabled = async () => {
    const email = this.state.currentUser?.email;
    if (!email) return;

    try {
      //`${API_BACKEND}/api/dandc_notifications/pushEnabled`
      const res = await axios.get(`http://localhost:5000/api/dandc_notifications/pushEnabled`, {
        params: { email },
      });
      console.log("[App] pushEnabled response:", res.data); //  log raw response
      this.setState({ pushEnabled: !!(res.data.pushEnabled ?? res.data.enabled) }) //  handle both possible keys
    } catch (err) {
      console.error("[App] Failed to fetch pushEnabled:", err);
      this.setState({ pushEnabled: false });
    }
  };


  /* ------------------------------
     Sidebar Renderer - UPDATED FOR MOBILE
     Author: Mobile Fix
     Event: Sprint 2
     LatestUpdate: 2025/10/01
     Description: Fixed mobile hamburger and sidebar behavior
  ------------------------------ */
toggleSidebar = () => {
  this.setState(prev => ({ sidebarCollapsed: !prev.sidebarCollapsed }));
};

renderSidebar() {
  const { unreadCount, sidebarCollapsed, isMobile, donationsNotifications, pushEnabled } = this.state;

  // For mobile: always show expanded when not collapsed
  const sidebarClass = isMobile 
    ? sidebarCollapsed ? "collapsed" : "expanded"
    : sidebarCollapsed ? "collapsed" : "expanded";

  return (
    <ChatContext>
      {({ channels, currentUserId }) => {
        let unreadMessagesCount = channels.filter(
          m => !m.readreceipts && m.senderid !== currentUserId
        ).length;

        // If pushEnabled is false, force unreadMessagesCount to 0
        if (!pushEnabled) unreadMessagesCount = 0;

        return (
          <nav className={`navbar ${sidebarClass}`}>
            {/* Hamburger toggle - ALWAYS VISIBLE */}
            <div className="hamburger-btn" onClick={this.toggleSidebar}>
              {sidebarCollapsed ? "≡" : "×"}
            </div>

            {/* Navigation links - conditionally show on mobile when expanded */}
            {(isMobile && sidebarCollapsed) ? null : (
              <>
                <div className="nav-links">
                  <Link to="/" onClick={() => isMobile && this.toggleSidebar()}>
                    🏡 <span className="label">Home</span>
                  </Link>
                  <Link to="/profile" onClick={() => isMobile && this.toggleSidebar()}>
                    🧑 <span className="label">Profile</span>
                  </Link>
                  <Link to="/bulkupload" onClick={() => isMobile && this.toggleSidebar()}>
                    🗂️ <span className="label">Bulk Upload</span>
                  </Link>
                  {/* Remove later ↓ */}
                  <Link to="/foodmanagement" onClick={() => isMobile && this.toggleSidebar()}>
                    🍎 <span className="label">Food Management</span>
                  </Link>
                  <Link to="/communication" className="notification-link" onClick={() => isMobile && this.toggleSidebar()}>
                    🗨️ <span className="label">Communication</span>
                    {unreadMessagesCount > 0 && (
                      <span className="notification-badge">{unreadMessagesCount}</span>
                    )}
                  </Link>
                  <Link to="/donations" className="notification-link" onClick={() => isMobile && this.toggleSidebar()}>
                    🧺 <span className="label">Donations</span>
                    {donationsNotifications > 0 && (
                      <span className="notification-badge">{donationsNotifications}</span>
                    )}
                  </Link>
                  <Link to="/recipes" onClick={() => isMobile && this.toggleSidebar()}>
                    🍲 <span className="label">Recipes</span>
                  </Link>
                  <Link to="/waste" onClick={() => isMobile && this.toggleSidebar()}>
                    ♻️ <span className="label">Waste Analysis</span>
                  </Link>
                  <Link to="/notifications" className="notification-link" onClick={() => isMobile && this.toggleSidebar()}>
                    🛎️ <span className="label">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="notification-badge">{unreadCount}</span>
                    )}
                  </Link>
                  <Link to="/expiry" onClick={() => isMobile && this.toggleSidebar()}>
                    ⏱️ <span className="label">Expiry Manager</span>
                  </Link>
                </div>

                {/* Logout */}
                <div className="sidebar-footer">
                  <button className="logout-btn" onClick={this.handleLogout}>
                    🏁 <span className="label">Log out</span>
                  </button>
                </div>
              </>
            )}
          </nav>
        );
      }}
    </ChatContext>
  );
}


  /* ------------------------------
     Main Render
  ------------------------------ */
  render() {
    const { currentUser, donationsNotifications, unreadCount } = this.state;

    return (
      <ChatProvider currentUserEmail={currentUser?.email} currentUserId={currentUser?.id}>
      <Router>
        {!currentUser ? (
          <Login onLogin={this.handleLogin} />
        ) : (
          <div>
            {this.renderSidebar()}
              <Routes>
                <Route path="/" element={<Home currentUser={currentUser} />} />
                <Route path="/profile" element={<User currentUser={currentUser} />} />
                <Route path="/HomeUser" element={<Home currentUser={currentUser} />} />
                <Route path="/communication" element={<Communication currentUser={currentUser} />} />
                
                {/* Chat Routes */}
                <Route path="/chatlist" element={<ChatList />} />
                <Route path="/chats/:donationId" element={<ChatThread currentUser={currentUser} />} />
                
                <Route path="/donations" element={<Donations currentUser={currentUser} />} />
                <Route path="/donor" element={<Donor currentUser={currentUser} />} />
                <Route path="/grocerylist" element={<GroceryList currentUser={currentUser} />} />
                <Route path="/recipes" element={<Recipes currentUser={currentUser} />} />
                <Route path="/waste" element={<Waste currentUser={currentUser} />} />
                <Route path="/expiry" element={<ExpiryManager currentUser={currentUser} />} />
                <Route path="/bulkupload" element={<BulkUpload currentUser={currentUser} />} />
                <Route path="/foodmanagement" element={<FoodManagement currentUser={currentUser} />} /> {/* remove later */}
                <Route path="/notifications" element={
                  <Notifications
                    currentUser={currentUser}
                    onRead={this.handleMarkNotificationRead}
                    refreshFlag={this.state.refreshFlag}
                  />
                } />
              </Routes>
            </div>
          )}
        </Router>
      </ChatProvider>
    );
  }
}

export default App;