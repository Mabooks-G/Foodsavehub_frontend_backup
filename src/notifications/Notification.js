/* Author: Kemo Mokoena
   Event: Sprint 1
   LatestUpdate: 2025/09/21
   Description: Frontend for Notifications component
   Returns: Shows stuff on React app
*/
// Import React hooks for state management and side effects
import { useEffect, useState } from "react";

// Import Axios for making HTTP requests to the backend API
import axios from "axios";

// Import the CSS file for styling the notifications component
import "./Notifications.css";

// Retrieve the backend API URL from environment variables
const API_BACKEND = process.env.REACT_APP_API_BACKEND;

// Define the Notification functional component
// Props:
//   currentUser: the currently logged-in user (i dont really use it--i fetch from localStorage instead)
//   onRead: a callback function to notify the parent component when a notification is read
//   refreshFlag: a value that triggers re-fetching notifications when it changes
export default function Notification({ currentUser, onRead, refreshFlag }) {
  
  // State to store notifications fetched from the backend
  const [notifications, setNotifications] = useState([]);
  
  // State to track if data is currently being loaded
  const [loading, setLoading] = useState(true);
  
  // State to track errors while fetching or updating notifications
  const [error, setError] = useState("");

  // Fixed line - exclude deleted notifications:
const unreadCount = notifications.filter(n => !n.notificationRead && !n.notificationDeleted).length;

  // useEffect runs when the component mounts or when refreshFlag changes
  // This is responsible for fetching notifications from the backend API
  // Also update your fetch to filter out deleted notifications
  // Update your fetchNotifications function with detailed logging
// In your frontend fetchNotifications function
// Replace your useEffect with this:
useEffect(() => {
  console.log("=== USEEFFECT TRIGGERED ===");
  console.log("refreshFlag value:", refreshFlag);
  
  const fetchNotifications = async () => {
    try {
      console.log("=== STARTING FETCH ===");
      
      const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
      console.log("Logged in user:", loggedInUser);
      
      if (!loggedInUser || !loggedInUser.email) {
        console.error("No user found in localStorage");
        return;
      }
      
      console.log("Fetching notifications for:", loggedInUser.email);
      console.log("API_BACKEND:", API_BACKEND);
      
      const res = await axios.get(
        `${API_BACKEND}/api/notifications`,
        { 
          params: { 
            email: loggedInUser.email,
            days: 2
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log("=== API RESPONSE RECEIVED ===");
      console.log("Response status:", res.status);
      console.log("Response data:", res.data);
      
      // Filter out notifications that are marked as deleted
      const activeNotifications = res.data.filter(
        notification => !notification.notificationDeleted
      );

      console.log("Active notifications after filter:", activeNotifications);
      
      // Calculate unread count for debugging
      const unreadCount = activeNotifications.filter(n => !n.notificationRead).length;
      console.log("=== FINAL CALCULATION ===");
      console.log("Total notifications:", res.data.length);
      console.log("Active notifications:", activeNotifications.length);
      console.log("Unread count:", unreadCount);
      
      setNotifications(activeNotifications);
      setError("");
      
    } catch (err) {
      console.error("=== FETCH ERROR ===");
      console.error("Error message:", err.message);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      setError("Failed to load notifications.");
    } finally {
      console.log("=== FETCH COMPLETE ===");
      setLoading(false);
    }
  };

  fetchNotifications();
}, [refreshFlag]);

// Update the unread count to also exclude deleted notifications
/*const unreadCount = notifications.filter(
  n => !n.notificationRead && !n.notificationDeleted
).length;*/

  // Function to handle deleting a notification
 const handleDelete = async (id) => {
  const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
  
  console.log("=== DELETE DEBUGGING ===");
  console.log("1. Starting delete for ID:", id);
  console.log("2. User email:", loggedInUser?.email);
  console.log("3. Full URL:", `${API_BACKEND}/api/notifications/${id}/delete`);
  console.log("4. Current notifications count:", notifications.length);

  try {
    console.log("5. Making API call...");
    
    const response = await axios.put(`${API_BACKEND}/api/notifications/${id}/delete`, {}, {
      params: { email: loggedInUser.email }
    });

    console.log("6. API call successful!");
    console.log("7. Response status:", response.status);
    console.log("8. Response data:", response.data);

    // Remove the notification from the UI immediately
    setNotifications((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      console.log("9. UI updated. New count:", updated.length);
      return updated;
    });

    // Force refresh by incrementing refreshFlag or re-fetching
    if (onRead) {
      onRead(); // This should trigger parent to refresh its count
    }

    // Notify parent with the new unread count
  if (onRead) {
    const newUnreadCount = notifications.filter(n => !n.notificationRead && n.id !== id).length;
    onRead(newUnreadCount);
  }

  
  } catch (err) {
    console.log("10. API call FAILED!");
    console.error("11. Error details:", err);
    console.error("12. Error response:", err.response?.data);
    console.error("13. Error status:", err.response?.status);
    console.error("14. Error message:", err.message);
    
    // Show error to user
    alert("Failed to delete notification. Check console for details.");
  }
};

  // Function to handle marking a notification as read
  const handleMarkAsRead = async (id) => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));
    
    try {
      // Send PUT request to backend to mark notification as read
      await axios.put(
        `${API_BACKEND}/api/notifications/${id}/read`,
        {}, // empty request body
        { params: { email: loggedInUser.email } } // email passed as query param
      );

      // Update local state immediately so the red dot disappears
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, notificationRead: true } : item
        )
      );

      // Notify parent component (if provided) that a notification was read
      if (onRead) onRead(id);

      // Notify parent with the new unread count
  if (onRead) {
    const newUnreadCount = notifications.filter(n => !n.notificationRead && n.id !== id).length;
    onRead(newUnreadCount);
  }

    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Show a loading message while fetching notifications
  if (loading) return (
  <div className="loading-container">
    <div className="spinner"></div>
    <p>Loading notifications...</p>
  </div>
);

  // Show an error message if fetching failed
  if (error) return <p className="error-msg">{error}</p>;

  // Render the notifications UI
  return (
    <div class="notification-page">
    <div className="notification-container">
      <div className="notification-card">
        {/* Title of the notification panel */}
        <h2 className="notification-title">Notifications</h2>

        {/* If there are no notifications, show a placeholder message */}
        {notifications.length === 0 ? (
          <p>No notifications available.</p>
        ) : (
          // Map through the notifications array and render each notification
          notifications.map((item) => (
            <div
              key={item.id}
              className="notification-item"
              // Clicking the notification marks it as read
              onClick={() => handleMarkAsRead(item.id)}
            >
              {/* Notification information */}
              <div className="notification-info">
                <p className="notification-title-text">
                  {item.name}
                  {/* Show a red dot for unread notifications */}
                  {!item.notificationRead && <span className="red-dot"></span>}
                </p>
                <p className="notification-meta">{item.expiryStatus}</p>
              </div>

              {/* Notification actions: status and delete button */}
              <div className="notification-actions">
                <span
                  className={`notification-status ${
                    item.status === "expired"
                      ? "status-expired"
                      : item.status === "warning"
                      ? "status-warning"
                      : "status-good"
                  }`}
                >
                  {item.status}
                </span>

                {/* Delete button */}
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // prevent marking as read when deleting
                    handleDelete(item.id);
                  }}
                  title="Delete notification"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </div>
  );
}
