/* Author: Gift Mabokela
   Event: Sprint 2
   LatestUpdate: 2025/09/18 - Auto-use region from user profile
   Description: Food management component with waste tracking
   Returns: React component for managing food items
*/

import React, { useState, useEffect } from 'react';
import './FoodManagement.css';
const API_BACKEND = process.env.REACT_APP_API_BACKEND || "https://foodsave-backend-tdwp.onrender.com";

const FoodManagement = ({ currentUser }) => {
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wasteStats, setWasteStats] = useState({ totalUsed: 0, totalWasted: 0, totalEntries: 0 });
  const [userRegion, setUserRegion] = useState('');

  /* Author: Gift Mabokela
     Event: Sprint 2
     LatestUpdate: 2025/09/18 - Auto-detect user region
     Description: Fetch user's food items, waste stats, and region
     Returns: void
  */
  useEffect(() => {
    fetchUserRegion();
    fetchFoodItems();
    fetchWasteStats();
  }, [currentUser]);

  const fetchUserRegion = async () => {
    try {
      const email = currentUser?.email;
      if (!email) return;

      const response = await fetch(`${API_BACKEND}/api/foodmanagement/user-profile?email=${email}`);
      
      if (response.ok) {
        const data = await response.json();
        setUserRegion(data.region || '');
      }
    } catch (err) {
      console.error('Error fetching user region:', err);
    }
  };

  const fetchFoodItems = async () => {
    try {
      setLoading(true);
      const email = currentUser?.email;
      if (!email) {
        setError('User email not available');
        return;
      }

      const response = await fetch(`${API_BACKEND}/api/foodmanagement/fooditems?email=${email}`);
      
      if (!response.ok) throw new Error('Failed to fetch food items');
      
      const data = await response.json();
      setFoodItems(data.foodItems || []);
      setError('');
    } catch (err) {
      setError('Error loading food items');
      console.error('Error fetching food items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWasteStats = async () => {
    try {
      const email = currentUser?.email;
      if (!email) return;

      const response = await fetch(`${API_BACKEND}/api/foodmanagement/waste-stats?email=${email}`);
      
      if (response.ok) {
        const data = await response.json();
        setWasteStats(data);
      }
    } catch (err) {
      console.error('Error fetching waste stats:', err);
    }
  };

  /* Author: Gift Mabokela
     Event: Sprint 2
     LatestUpdate: 2025/09/18 - Auto-use region, no city prompt needed
     Description: Mark food item as used
     Returns: void
  */
  const markAsUsed = async (foodItemId, currentQuantity) => {
    try {
      const quantityUsed = prompt(`How many items were used? (Available: ${currentQuantity})`, currentQuantity);
      
      if (!quantityUsed || isNaN(quantityUsed) || quantityUsed <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      if (parseInt(quantityUsed) > currentQuantity) {
        alert('Quantity used cannot exceed available quantity');
        return;
      }

      const response = await fetch(`${API_BACKEND}/api/foodmanagement/mark-used/${foodItemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityUsed: parseInt(quantityUsed),
          email: currentUser?.email
          // City will be auto-detected from user's region
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.message}\nLocation: ${result.autoDetectedCity}`);
        fetchFoodItems();
        fetchWasteStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to mark as used');
      }
    } catch (err) {
      alert('Error marking item as used');
      console.error('Error:', err);
    }
  };

  /* Author: Gift Mabokela
     Event: Sprint 2
     LatestUpdate: 2025/09/18 - Auto-use region, no city prompt needed
     Description: Mark food item as wasted
     Returns: void
  */
  const markAsWasted = async (foodItemId, currentQuantity) => {
    try {
      const quantityWasted = prompt(`How many items were wasted? (Available: ${currentQuantity})`, currentQuantity);
      
      if (!quantityWasted || isNaN(quantityWasted) || quantityWasted <= 0) {
        alert('Please enter a valid quantity');
        return;
      }

      if (parseInt(quantityWasted) > currentQuantity) {
        alert('Quantity wasted cannot exceed available quantity');
        return;
      }

      const response = await fetch(`${API_BACKEND}/api/foodmanagement/mark-wasted/${foodItemId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantityWasted: parseInt(quantityWasted),
          email: currentUser?.email
          // City will be auto-detected from user's region
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.message}\nLocation: ${result.autoDetectedCity}`);
        fetchFoodItems();
        fetchWasteStats();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to mark as wasted');
      }
    } catch (err) {
      alert('Error marking item as wasted');
      console.error('Error:', err);
    }
  };

  /* Author: Gift Mabokela
     Event: Sprint 2
     LatestUpdate: 2025/09/18
     Description: Format date for display
     Returns: Formatted date string
  */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return <div className="loading">Loading food items...</div>;
  }

  return (
    <div className="food-management-container">
      <h1>Food Management</h1>
      
      {/* User Region Info */}
      {userRegion && (
        <div className="user-region-info">
          <p><strong>📍 Your Location:</strong> {userRegion}</p>
          <p className="region-note">Waste tracking will automatically use your registered region</p>
        </div>
      )}

      {/* Waste Statistics */}
      <div className="waste-stats">
        <h2>Your Waste Statistics</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-number">{wasteStats.totalUsed}</span>
            <span className="stat-label">Items Used</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{wasteStats.totalWasted}</span>
            <span className="stat-label">Items Wasted</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{wasteStats.totalEntries}</span>
            <span className="stat-label">Total Entries</span>
          </div>
        </div>
      </div>

      {/* Food Items List */}
      <div className="food-items-section">
        <h2>Your Food Items ({foodItems.length})</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {foodItems.length === 0 ? (
          <div className="no-items">No food items available</div>
        ) : (
          <div className="food-items-grid">
            {foodItems.map(item => (
              <div key={item.fooditemid} className="food-item-card">
                <div className="item-header">
                  <h3>{item.name}</h3>
                  <span className="quantity-badge">{item.quantity} items</span>
                </div>
                
                <div className="item-details">
                  <p><strong>Expiry:</strong> {formatDate(item.expirydate)}</p>
                  <p><strong>Category:</strong> {item.foodcategory || 'N/A'}</p>
                  {item.Measure_per_Unit && (
                    <p><strong>Measure:</strong> {item.Measure_per_Unit} {item.Unit}</p>
                  )}
                </div>
                
                <div className="item-actions">
                  <button 
                    className="btn-used"
                    onClick={() => markAsUsed(item.fooditemid, item.quantity)}
                    title="Mark as used"
                  >
                    ✅ Used
                  </button>
                  
                  <button 
                    className="btn-wasted"
                    onClick={() => markAsWasted(item.fooditemid, item.quantity)}
                    title="Mark as wasted"
                  >
                    🗑️ Wasted
                  </button>
                </div>
                
                {!userRegion && (
                  <div className="region-warning">
                    ⚠️ No region set in your profile. Using default location.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="instructions">
        <h3>How to use:</h3>
        <ul>
          <li>Your waste tracking location is automatically set to: <strong>{userRegion || 'Default location'}</strong></li>
          <li>Click "Used" when you consume food items</li>
          <li>Click "Wasted" when food items expire or go bad</li>
          <li>Items will be moved to waste tracking automatically</li>
          <li>View detailed analytics in the Waste Analysis section</li>
          {!userRegion && (
            <li>💡 <em>Update your profile to set your region for accurate location tracking</em></li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default FoodManagement;