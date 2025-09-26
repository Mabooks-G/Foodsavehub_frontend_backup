/* Author: Bethlehem Shimelis
   Event: Sprint 1: Dashboard View for Food Inventory
   LatestUpdate: Added inline editing, deletion confirmation, and category filtering
   parameters: currentUser, onAddNew
   Description: Displays the user's food items in a table with expiry status,
                allows inline edits, deleting items with confirmation, 
                filtering by category, and sorting by expiry date
   Returns: Updates dashboard when edits/deletions are made, triggers add-new form
*/
import { useEffect, useState } from "react";
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

  const fetchFoodItems = async () => {
    try {
      const res = await axios.get(
        `${API_BACKEND}/api/users/fooditems?email=${currentUser.email}`
      );
      setAllFoodItems(res.data.foodItems);
      setFoodItems(res.data.foodItems);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchFoodItems(); }, []);

  const handleFilterChange = (e) => {
    const category = e.target.value;
    setFilterCategory(category);
    setFoodItems(category ? allFoodItems.filter(f => f.foodcategory === category) : allFoodItems);
  };

  const getExpiryClass = (expirydate) => {
    const today = new Date();
    const expiry = new Date(expirydate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 2) return "expired";
    if (diffDays <= 7) return "expiring-soon";
    if (diffDays > 7) return "expiring-week";
    return "fresh";
  };

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

  const handleDeleteRequest = (id) => setDeleteConfirmId(id);
  const handleConfirmDelete = async (id) => { 
    try { await axios.delete(`${API_BACKEND}/api/users/fooditems/${id}?email=${currentUser.email}`);
      setDeleteConfirmId(null); fetchFoodItems();
    } catch(err) { console.error(err); }
  };
  const handleCancelDelete = () => setDeleteConfirmId(null);

  return (
    <div className={`main-content ${navbarExpanded ? "expanded" : ""}`}>
      {/* Sticky header */}
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

      {/* Cards */}
      <div className="mobile-cards">
        {foodItems.sort((a,b)=>new Date(a.expirydate)-new Date(b.expirydate)).map(item => (
          <div 
            key={item.fooditemid} 
            className={`food-card ${getExpiryClass(item.expirydate)}`}
            style={{ height: editingId === item.fooditemid ? 'auto' : '220px' }}
          >
            <div className="card-row">
              <label>Category:</label>
              {editingId===item.fooditemid ? (
                <select name="foodcategory" value={editedItem.foodcategory} onChange={handleInputChange}>
                  {["Produce","Dairy & Eggs","Meat","Seafood","Bakery","Grains","Frozen Foods","Beverages","Snacks","Prepared Meals","Other"].map(cat=>(<option key={cat} value={cat}>{cat}</option>))}
                </select>
              ) : item.foodcategory}
            </div>

            <div className="card-row">
              <label>Name:</label>
              {editingId===item.fooditemid ? <input name="name" value={editedItem.name} onChange={handleInputChange} /> : item.name}
            </div>

            <div className="card-row">
              <label>Expiry:</label>
              {editingId===item.fooditemid ? <input type="date" name="expirydate" value={editedItem.expirydate.slice(0,10)} onChange={handleInputChange} /> : new Date(item.expirydate).toLocaleDateString()}
            </div>

            <div className="card-row">
              <label>Quantity:</label>
              {editingId===item.fooditemid ? <input type="number" name="quantity" value={editedItem.quantity} onChange={handleInputChange} /> : item.quantity}
            </div>

            <div className="card-row">
              <label>Measure:</label>
              {editingId===item.fooditemid ? <input type="number" name="Measure_per_Unit" value={editedItem.Measure_per_Unit} onChange={handleInputChange} /> : item.Measure_per_Unit}
            </div>

            <div className="card-row">
              <label>Unit:</label>
              {editingId===item.fooditemid ? <select name="Unit" value={editedItem.Unit} onChange={handleInputChange}>{["ml","L","g","kg"].map(u=><option key={u} value={u}>{u}</option>)}</select> : item.Unit}
            </div>

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

      <div className="add-btn-container">
        <button className="btn btn-green" onClick={onAddNew}>Add Food Item</button>
      </div>
    </div>
  );
}
