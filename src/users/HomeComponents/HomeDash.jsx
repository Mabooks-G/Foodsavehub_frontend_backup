/* Author: Bethlehem Shimelis
   Event: Sprint 1: Dashboard View for Food Inventory
   LatestUpdate: Added inline editing, deletion confirmation, and category filtering
   Parameters: 
      currentUser - the logged-in user object (includes email)
      onAddNew - callback to trigger the add-new food item form
      navbarExpanded - boolean to adjust layout if the navbar is expanded
   Description: Displays the user's food items in a mobile-friendly card layout,
                shows expiry status, allows inline edits with validation,
                deletion with confirmation, category filtering, and sorting by expiry.
   Returns: Updates the displayed food items when edits/deletions occur, triggers onAddNew callback
*/

import { useEffect, useState } from "react";
import axios from "axios";
import "../HomeUser.css";

// Backend API base URL, pulled from environment variables
const API_BACKEND = process.env.REACT_APP_API_BACKEND;

export default function HomeDash({ currentUser, onAddNew, navbarExpanded }) {
  // State for all food items fetched from the backend
  const [allFoodItems, setAllFoodItems] = useState([]);
  // State for currently displayed (filtered) food items
  const [foodItems, setFoodItems] = useState([]);
  // State for currently selected category filter
  const [filterCategory, setFilterCategory] = useState("");
  // ID of the row currently being edited
  const [editingId, setEditingId] = useState(null);
  // Stores the current values of the item being edited
  const [editedItem, setEditedItem] = useState({});
  // Stores validation errors for individual fields when editing
  const [rowError, setRowError] = useState({});
  // Tracks which row is currently awaiting delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch all food items from the backend for this user
  const fetchFoodItems = async () => {
    try {
      const res = await axios.get(
        `${API_BACKEND}/api/users/fooditems?email=${currentUser.email}`
      );
      setAllFoodItems(res.data.foodItems); // Save full dataset
      setFoodItems(res.data.foodItems);    // Display dataset
    } catch (err) {
      console.error(err); // Log any errors to console
    }
  };

  // Fetch food items once on component mount
  useEffect(() => { fetchFoodItems(); }, []);

  // Handles category filter changes
  const handleFilterChange = (e) => {
    const category = e.target.value;
    setFilterCategory(category);
    // Filter displayed items based on selected category
    setFoodItems(category ? allFoodItems.filter(f => f.foodcategory === category) : allFoodItems);
  };

  // Determine CSS class for card based on expiry date
  const getExpiryClass = (expirydate) => {
    const today = new Date();
    const expiry = new Date(expirydate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24)); // days until expiry
    if (diffDays <= 2) return "expired";
    if (diffDays <= 7) return "expiring-soon";
    if (diffDays > 7) return "expiring-week";
    return "fresh"; // fallback
  };

  // Start editing a row
  const handleEditClick = (item) => { 
    setEditingId(item.fooditemid); 
    setEditedItem({ ...item }); 
    setRowError({}); // Clear any previous errors
  };
  // Cancel editing
  const handleCancelEdit = () => { 
    setEditingId(null); 
    setEditedItem({}); 
    setRowError({}); 
  };
  // Update editedItem state as user types
  const handleInputChange = (e) => { 
    setEditedItem({ ...editedItem, [e.target.name]: e.target.value }); 
  };

  // Save edits to backend
  const handleSave = async (id) => {
    const today = new Date(); today.setHours(0,0,0,0); // normalize to midnight
    const expiry = new Date(editedItem.expirydate);

    // Validation errors
    const error = {};
    if (!editedItem.name || editedItem.name.trim() === "") error.name = "fill-in item name";
    if (!editedItem.expirydate || expiry <= today) error.expirydate = "expiry must be future dated";

    if (Object.keys(error).length > 0) { 
      setRowError(error); 
      return; 
    }

    try {
      await axios.put(
        `${API_BACKEND}/api/users/fooditems/${id}`, 
        {...editedItem, email: currentUser.email}
      );
      setEditingId(null); 
      setEditedItem({}); 
      setRowError({});
      fetchFoodItems(); // Refresh the dashboard
    } catch(err) { 
      console.error("Failed to save edit:", err.response?.data || err); 
    }
  };

  // Initiate delete confirmation
  const handleDeleteRequest = (id) => setDeleteConfirmId(id);
  // Confirm deletion and call backend
  const handleConfirmDelete = async (id) => { 
    try { 
      await axios.delete(`${API_BACKEND}/api/users/fooditems/${id}?email=${currentUser.email}`);
      setDeleteConfirmId(null); 
      fetchFoodItems(); // Refresh dashboard
    } catch(err) { console.error(err); }
  };
  // Cancel deletion
  const handleCancelDelete = () => setDeleteConfirmId(null);

  return (
    <div className={`main-content ${navbarExpanded ? "expanded" : ""}`}>
      
      {/* Sticky header with table title and category filter */}
      <div className="sticky-header">
        <h1 className="table-title">Your Food Items</h1>
        <div className="filter-container">
          <label>Filter by category: </label>
          <select value={filterCategory} onChange={handleFilterChange}>
            <option value="">All</option>
            {["Produce","Dairy & Eggs","Meat","Seafood","Bakery","Grains","Frozen Foods","Beverages","Snacks","Prepared Meals","Other"].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Food item cards (mobile-friendly layout) */}
      <div className="mobile-cards">
        {foodItems
          .sort((a,b) => new Date(a.expirydate) - new Date(b.expirydate)) // sort by expiry
          .map(item => (
            <div 
              key={item.fooditemid} 
              className={`food-card ${getExpiryClass(item.expirydate)}`} // expiry-based coloring
              style={{ height: editingId === item.fooditemid ? 'auto' : '220px' }} // expand if editing
            >
              {/* Category row */}
              <div className="card-row">
                <label>Category:</label>
                {editingId===item.fooditemid ? (
                  <select name="foodcategory" value={editedItem.foodcategory} onChange={handleInputChange}>
                    {["Produce","Dairy & Eggs","Meat","Seafood","Bakery","Grains","Frozen Foods","Beverages","Snacks","Prepared Meals","Other"].map(cat=>(<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                ) : item.foodcategory}
              </div>

              {/* Name row */}
              <div className="card-row">
                <label>Name:</label>
                {editingId===item.fooditemid ? <input name="name" value={editedItem.name} onChange={handleInputChange} /> : item.name}
              </div>

              {/* Expiry row */}
              <div className="card-row">
                <label>Expiry:</label>
                {editingId===item.fooditemid ? <input type="date" name="expirydate" value={editedItem.expirydate.slice(0,10)} onChange={handleInputChange} /> : new Date(item.expirydate).toLocaleDateString()}
              </div>

              {/* Quantity row */}
              <div className="card-row">
                <label>Quantity:</label>
                {editingId===item.fooditemid ? <input type="number" name="quantity" value={editedItem.quantity} onChange={handleInputChange} /> : item.quantity}
              </div>

              {/* Measure per unit row */}
              <div className="card-row">
                <label>Measure:</label>
                {editingId===item.fooditemid ? <input type="number" name="Measure_per_Unit" value={editedItem.Measure_per_Unit} onChange={handleInputChange} /> : item.Measure_per_Unit}
              </div>

              {/* Unit row */}
              <div className="card-row">
                <label>Unit:</label>
                {editingId===item.fooditemid ? (
                  <select name="Unit" value={editedItem.Unit} onChange={handleInputChange}>
                    {["ml","L","g","kg"].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : item.Unit}
              </div>

              {/* Action buttons: Edit / Delete / Save / Cancel / Confirm Delete */}
              <div className="card-row">
                {editingId===item.fooditemid ? (
                  <>
                    <button className="btn btn-orange" onClick={()=>handleSave(item.fooditemid)}>Save</button>
                    <button className="btn btn-gray" onClick={handleCancelEdit}>Cancel</button>
                  </>
                ) : deleteConfirmId===item.fooditemid ? (
                  <>
                    <span>Are you sure?</span>
                    <button className="btn btn-red" onClick={()=>handleConfirmDelete(item.fooditemid)}>Yes</button>
                    <button className="btn btn-gray" onClick={handleCancelDelete}>No</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-orange" onClick={()=>handleEditClick(item)}>Edit</button>
                    <button className="btn btn-red" onClick={()=>handleDeleteRequest(item.fooditemid)}>Delete</button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Add new food item button */}
      <div className="add-btn-container">
        <button className="btn btn-green" onClick={onAddNew}>Add Food Item</button>
      </div>
    </div>
  );
}
