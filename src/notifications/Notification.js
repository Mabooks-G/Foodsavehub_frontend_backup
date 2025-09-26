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

  // Compute the number of unread notifications for display purposes
  const unreadCount = notifications.filter(n => !n.notificationRead).length;

  // useEffect runs when the component mounts or when refreshFlag changes
  // This is responsible for fetching notifications from the backend API
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // Retrieve the logged-in user from localStorage
        const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

        // Make a GET request to fetch notifications for the user
        // The 'days' parameter limits notifications to those expiring in <= 2 days
        const res = await axios.get(
          `${API_BACKEND}/api/notifications`,
          { params: { 
            email: loggedInUser.email,
            days: 2
          } }
        );

        // Store the fetched notifications in component state
        setNotifications(res.data);

        // Clear any previous errors
        setError("");
      } catch (err) {
        // Log the error and update state with an error message
        console.error("Fetch notifications error:", err);
        setError("Failed to load notifications.");
      } finally {
        // Stop showing the loading spinner/message
        setLoading(false);
      }
    };

    // Call the async function defined above
    fetchNotifications();
  }, [refreshFlag]); // re-run effect whenever refreshFlag changes

  // Function to handle deleting a notification
  const handleDelete = async (id) => {
    const loggedInUser = JSON.parse(localStorage.getItem("loggedInUser"));

    try {
      // Send PUT request to mark the notification as deleted in the backend
      await axios.put(`${API_BACKEND}/api/notifications/${id}/delete`, {}, {
        params: { email: loggedInUser.email }
      });

      // Remove the notification from the UI immediately
      setNotifications((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Failed to mark notification as deleted:", err);
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
  );
}
