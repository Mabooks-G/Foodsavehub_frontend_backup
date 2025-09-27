



/* Author: Bethlehem Shimelis
   Event: Sprint 1: Add Food Item Form (manual input, expiry etc)
   LatestUpdate: added validation, posts to backend, handles success + error msgs
   parameters: currentUser, onClose, onRefresh
   Description: renders a table-style form to add food items
                keeps track of inputs, validates, posts to backend
   Returns: triggers dashboard refresh, shows messages, resets form
*/

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../HomeUser.css";
const API_BACKEND = process.env.REACT_APP_API_BACKEND;

export default function HomeForm({ currentUser, onClose, onRefresh }) {
  const navigate = useNavigate();
  const location = useLocation(); // capture state passed from Scan.js

  // --- state stuff ---
  const [form, setForm] = useState({
    name: "",
    expirydate: "",
    quantity: 1,
    foodcategory: "",
    Measure_per_Unit: 1,
    Unit: "g",
  });
  const [error, setError] = useState(""); // show error msgs
  const [success, setSuccess] = useState(""); // show success msgs

  //  Autofill from Scan.js
  useEffect(() => {
    if (location.state?.scannedData) {
      setForm((prev) => ({
        ...prev,
        name: location.state.scannedData, // prefill Name field
        // later you can also parse and set category here
      }));
    }
  }, [location.state]);

  // dropdown options
  const foodCategories = [
    "Produce","Dairy & Eggs","Meat","Seafood","Bakery","Grains",
    "Frozen Foods","Beverages","Snacks","Prepared Meals","Other",
  ];
  const units = ["ml", "L", "g", "kg"];

  // handle any input / select change 
  const handleChange = (e) => {
    let value = e.target.value;
    if (e.target.type === "number") value = Number(value); // convert numbers
    setForm({ ...form, [e.target.name]: value }); // update the right field
  };

  // submit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setSuccess("");

    // --- quick validation checks ---
    if (!form.name || form.name.trim() === "") return setError("Name is required");
    const expiry = new Date(form.expirydate);
    const today = new Date(); today.setHours(0,0,0,0);
    if (!form.expirydate || expiry <= today) return setError("Expiry date must be in the future");
    if (form.quantity <= 0) return setError("Quantity must be at least 1");
    if (form.Measure_per_Unit <= 0) return setError("Measure per unit must be at least 1");
    if (!form.foodcategory) return setError("Please select a category");

    try {
      // --- send to backend ---
      const payload = {
        email: currentUser.email,
        name: form.name,
        expirydate: form.expirydate,
        quantity: form.quantity,
        foodcategory: form.foodcategory,
        Measure_per_Unit: form.Measure_per_Unit,
        Unit: form.Unit,
      };
      await axios.post(`${API_BACKEND}/api/users/fooditems`, payload);

      // --- on success ---
      setSuccess("Food item added!"); // nice
      setForm({ name:"", expirydate:"", quantity:1, foodcategory:"", Measure_per_Unit:1, Unit:"g" }); // reset form
      if (onRefresh) onRefresh(); // update dashboard
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to add food item"); // show error
    }
  };

  const handleScanClick = () => {
    navigate("/Scan"); // navigate to Scan.js page
  };

  // --- UI render ---
  return (
    <div className="table-form-container">
      <h1 className="table-title">Add Food Item</h1>
      <form onSubmit={handleSubmit}>
        <table className="form-table">
          <tbody>
            {/* name input */}
            <tr>
              <td>Name:</td>
              <td>
                <input type="text" name="name" value={form.name} onChange={handleChange} />
              </td>
            </tr>

            {/* expiry date */}
            <tr>
              <td>Expiry Date:</td>
              <td>
                <input type="date" name="expirydate" value={form.expirydate} onChange={handleChange} />
              </td>
            </tr>

            {/* quantity */}
            <tr>
              <td>Quantity:</td>
              <td>
                <input type="number" name="quantity" min="1" value={form.quantity} onChange={handleChange} />
              </td>
            </tr>

            {/* category */}
            <tr>
              <td>Category:</td>
              <td>
                <select name="foodcategory" value={form.foodcategory} onChange={handleChange}>
                  <option value="">Select Category</option>
                  {foodCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </td>
            </tr>

            {/* measure per unit + unit */}
            <tr>
              <td>Measure per Unit:</td>
              <td>
                <input
                  type="number"
                  name="Measure_per_Unit"
                  min="1"
                  value={form.Measure_per_Unit}
                  onChange={handleChange}
                  style={{ display: "block", marginBottom: "5px" }}
                />
                <select
                  name="Unit"
                  value={form.Unit}
                  onChange={handleChange}
                  style={{ display: "block" }}
                >
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        {/* messages */}
        {error && <p className="error-msg">{error}</p>}
        {success && <p className="success-msg">{success}</p>}

        {/* buttons */}
        <div className="form-buttons add-btn-container">
          <button type="submit" className="btn btn-green">Add Item</button>
          <button type="button" className="btn btn-green" onClick={handleScanClick}>Scan Item</button>
          <button type="button" className="btn btn-green" onClick={onClose}>Back to Inventory</button>
        </div>
      </form>
    </div>
  );
}
