import React, { useEffect, useState } from "react";
import axios from "axios";
import "../HomeUser.css";

const API_BACKEND = process.env.REACT_APP_API_BACKEND;

export default function HomeDash({ currentUser, onAddNew, navbarExpanded }) {
  const [allFoodItems, setAllFoodItems] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedItem, setEditedItem] = useState({});
  const [rowError, setRowError] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [wasteStats, setWasteStats] = useState({ totalUsed: 0, totalWasted: 0, totalEntries: 0 });

  // Fetch all food items and merge with used/wasted data
  const fetchFoodItems = async () => {
    try {
      // Fetch main food items
      const res = await axios.get(`${API_BACKEND}/api/users/fooditems?email=${currentUser.email}`);
      let items = res.data.foodItems;

      // Fetch waste stats / used-wasted quantities
      const wasteRes = await axios.get(`${API_BACKEND}/api/foodmanagement/waste-stats?email=${currentUser.email}`);
      const wasteData = wasteRes.data; // { used: [...], wasted: [...], totalUsed, totalWasted }

      // Merge used/wasted into each food item
      items = items.map(item => {
        const usedItem = wasteData.used?.find(w => w.fooditemid === item.fooditemid);
        const wastedItem = wasteData.wasted?.find(w => w.fooditemid === item.fooditemid);
        return {
          ...item,
          usedQuantity: usedItem?.quantityUsed || 0,
          wastedQuantity: wastedItem?.quantityWasted || 0,
          remainingQuantity: item.quantity - (usedItem?.quantityUsed || 0) - (wastedItem?.quantityWasted || 0)
        };
      });

      setAllFoodItems(items);
      setFoodItems(filterCategory ? items.filter(f => f.foodcategory === filterCategory) : items);
      setWasteStats({
        totalUsed: wasteData.totalUsed || 0,
        totalWasted: wasteData.totalWasted || 0,
        totalEntries: items.length
      });
    } catch (err) {
      console.error("Error fetching food items:", err);
    }
  };

  useEffect(() => { fetchFoodItems(); }, []);

  // Category filter
  const handleFilterChange = (e) => {
    const category = e.target.value;
    setFilterCategory(category);
    setFoodItems(category ? allFoodItems.filter(f => f.foodcategory === category) : allFoodItems);
  };

  // Expiry class helper
  const getExpiryClass = (expirydate) => {
    const today = new Date();
    const expiry = new Date(expirydate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return "expired";
    if (diffDays <= 7) return "expiring-soon";
    if (diffDays > 7) return "expiring-week";
    return "fresh";
  };

  // Inline edit handlers
  const handleEditClick = (item) => { setEditingId(item.fooditemid); setEditedItem({ ...item }); setRowError({}); };
  const handleCancelEdit = () => { setEditingId(null); setEditedItem({}); setRowError({}); };
  const handleInputChange = (e) => { setEditedItem({ ...editedItem, [e.target.name]: e.target.value }); };

  const handleSave = async (id) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const expiry = new Date(editedItem.expirydate);
    const error = {};
    if (!editedItem.name || editedItem.name.trim() === "") error.name = "fill-in item name";
    if (!editedItem.expirydate || expiry <= today) error.expirydate = "expiry must be future dated";
    if (Object.keys(error).length > 0) { setRowError(error); return; }

    try {
      await axios.put(`${API_BACKEND}/api/users/fooditems/${id}`, {...editedItem, email: currentUser.email});
      setEditingId(null); setEditedItem({}); setRowError({});
      fetchFoodItems();
    } catch(err) { console.error("Failed to save edit:", err.response?.data || err); }
  };

  // Delete handlers
  const handleDeleteRequest = (id) => setDeleteConfirmId(id);
  const handleConfirmDelete = async (id) => {
    try {
      await axios.delete(`${API_BACKEND}/api/users/fooditems/${id}?email=${currentUser.email}`);
      setDeleteConfirmId(null);
      fetchFoodItems();
    } catch(err) { console.error(err); }
  };
  const handleCancelDelete = () => setDeleteConfirmId(null);

  // Mark as Used / Wasted
 // Mark as Used / Wasted
const markAsUsed = async (foodItemId, currentQuantity) => {
  const quantityUsed = parseInt(prompt(`How many items were used? (Available: ${currentQuantity})`, currentQuantity));
  if (!quantityUsed || quantityUsed <= 0 || quantityUsed > currentQuantity) {
    alert('Invalid quantity'); return;
  }
  try {
    await axios.post(`${API_BACKEND}/api/foodmanagement/mark-used/${foodItemId}`, {
      quantityUsed,
      email: currentUser.email
    });
    fetchFoodItems();
  } catch (err) {
    console.error(err);
    alert('Failed to mark as used');
  }
};

const markAsWasted = async (foodItemId, currentQuantity) => {
  const quantityWasted = parseInt(prompt(`How many items were wasted? (Available: ${currentQuantity})`, currentQuantity));
  if (!quantityWasted || quantityWasted <= 0 || quantityWasted > currentQuantity) {
    alert('Invalid quantity'); return;
  }
  try {
    await axios.post(`${API_BACKEND}/api/foodmanagement/mark-wasted/${foodItemId}`, {
      quantityWasted,
      email: currentUser.email
    });
    fetchFoodItems();
  } catch (err) {
    console.error(err);
    alert('Failed to mark as wasted');
  }
};

  return (
    <div className={`main-content ${navbarExpanded ? "expanded" : ""}`}>
      
      {/* Header + Filter */}
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

      {/* Waste Stats Summary */}
      <div className="waste-stats">
        <span>✅ Used: {wasteStats.totalUsed}</span>
        <span>🗑️ Wasted: {wasteStats.totalWasted}</span>
        <span>📦 Total Entries: {wasteStats.totalEntries}</span>
      </div>

      {/* Food item cards */}
      <div className="mobile-cards">
        {foodItems
          .sort((a,b) => new Date(a.expirydate) - new Date(b.expirydate))
          .map(item => (
          <div key={item.fooditemid} className={`food-card ${getExpiryClass(item.expirydate)}`} style={{ height: editingId===item.fooditemid?'auto':'220px' }}>
            
            {/* Category */}
            <div className="card-row">
              <label>Category:</label>
              {editingId===item.fooditemid ? (
                <select name="foodcategory" value={editedItem.foodcategory} onChange={handleInputChange}>
                  {["Produce","Dairy & Eggs","Meat","Seafood","Bakery","Grains","Frozen Foods","Beverages","Snacks","Prepared Meals","Other"].map(cat=>(<option key={cat} value={cat}>{cat}</option>))}
                </select>
              ) : item.foodcategory}
            </div>

            {/* Name */}
            <div className="card-row">
              <label>Name:</label>
              {editingId===item.fooditemid ? <input name="name" value={editedItem.name} onChange={handleInputChange} /> : item.name}
            </div>

            {/* Expiry */}
            <div className="card-row">
              <label>Expiry:</label>
              {editingId===item.fooditemid ? <input type="date" name="expirydate" value={editedItem.expirydate.slice(0,10)} onChange={handleInputChange} /> : new Date(item.expirydate).toLocaleDateString()}
            </div>

            {/* Quantity */}
            <div className="card-row">
              <label>Quantity:</label>
              {editingId===item.fooditemid ? (
                <input type="number" name="quantity" value={editedItem.quantity} onChange={handleInputChange} />
              ) : (
                <>
                  {item.remainingQuantity} / {item.quantity} <span className="used-wasted">(Used: {item.usedQuantity}, Wasted: {item.wastedQuantity})</span>
                </>
              )}
            </div>

            {/* Measure */}
            <div className="card-row">
              <label>Measure:</label>
              {editingId===item.fooditemid ? <input type="number" name="Measure_per_Unit" value={editedItem.Measure_per_Unit} onChange={handleInputChange} /> : item.Measure_per_Unit}
            </div>

            {/* Unit */}
            <div className="card-row">
              <label>Unit:</label>
              {editingId===item.fooditemid ? (
                <select name="Unit" value={editedItem.Unit} onChange={handleInputChange}>
                  {["ml","L","g","kg"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              ) : item.Unit}
            </div>

            {/* Actions */}
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
                  <button className="btn btn-used" onClick={()=>markAsUsed(item.fooditemid, item.remainingQuantity)}>✅ Used</button>
                  <button className="btn btn-wasted" onClick={()=>markAsWasted(item.fooditemid, item.remainingQuantity)}>🗑️ Wasted</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new item */}
      <div className="add-btn-container">
        <button className="btn btn-green" onClick={onAddNew}>Add Food Item</button>
      </div>
    </div>
  );
}
