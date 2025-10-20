/* Author: Nomusa
   Event: Sprint 2
   LatestUpdate: 28 Sept 2025
   Description: Scan component for barcode scanning, DB/API lookup, and manual entry
*/

// src/users/Scan.js
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import supabase from "../supabaseClient";
import "./Scan.css";

/* 
   Author: Nomusa
   Event: Sprint 2
   LatestUpdate: 28 Sept 2025
   Function: Scan
   Description: Main React component for scanning barcodes, fetching product info from Supabase or backend API,
                allowing manual edits, and navigating back with the scanned or entered data.
*/
function Scan() {
  const navigate = useNavigate();
  const location = useLocation();
  const scannedCode = location.state?.scannedCode;

  // State variables
  const [scannedData, setScannedData] = useState("Scanned Item (Autofill)"); // Display name of scanned item
  const [isEditing, setIsEditing] = useState(false); // Controls edit input visibility
  const [notFound, setNotFound] = useState(false); // True if item not found in DB/API
  const [brand, setBrand] = useState(""); // Brand for manual entry
  const [name, setName] = useState("");   // Item name for manual entry

  /* 
     Author: Nomusa
     Event: Sprint 2
     LatestUpdate: 28 Sept 2025
     Function: fetchProduct
     Description: Executes when component mounts or scannedCode changes. Tries DB first, then API,
                  finally enables manual entry if neither returns data.
  */
  useEffect(() => {
    async function fetchProduct() {
      if (!scannedCode) return; // Stop if no barcode provided

      // 1️. Check Supabase first
      const { data: dbItem, error: dbError } = await supabase
        .from("scandb")
        .select("*")
        .eq("ScannedCode", scannedCode)
        .maybeSingle();

      if (dbError) console.error("Supabase query error:", dbError);

      if (dbItem) {
        setScannedData(`${dbItem.ItemBrands} ${dbItem.ItemName}`); // Prefill scanned data
        setNotFound(false);
        return; // Stop further execution if item found
      }

      // 2️. If not found in DB, call backend API
      try {
        const res = await axios.get(`http://localhost:5000/api/barcode/${scannedCode}`);
        const product = res.data.products?.[0];

        if (product) {
          const productName = `${product.brand || product.manufacturer || "Unknown"} ${product.title || "Unknown Item"}`;
          setScannedData(productName);
          setNotFound(false);

          // 3️. Save API result to Supabase
          const { data, error } = await supabase.from("scandb").insert([
            {
              ItemBrands: product.brand || product.manufacturer || "Unknown",
              ItemName: product.title || "Unknown Item",
              ScannedCode: scannedCode,
            },
          ]);
          if (error) console.error("Supabase insert error:", error);
          return; // Stop execution since API returned a result
        }
      } catch (err) {
        console.error("Backend barcode API error:", err);
      }

      // 4. If neither DB nor API returned a result → manual entry required
      setScannedData(scannedCode);
      setNotFound(true);
    }

    fetchProduct();
  }, [scannedCode]);

  /* 
     Author: Nomusa
     Event: Sprint 2
     LatestUpdate: 28 Sept 2025
     Function: handleAccept
     Description: Triggered by ACCEPT button, navigates to HomeUser and pre-fills the form with scannedData
  */
  const handleAccept = () => {
    navigate("/HomeUser", {
      state: {
        showForm: true,       // tells HomeUser to open HomeForm
        scannedData,          // prefill name
      },
    });
  };

  /* 
     Author: Nomusa
     Event: Sprint 2
     LatestUpdate: 28 Sept 2025
     Function: handleSubmit
     Description: Triggered when manually entered item is submitted; saves to Supabase and navigates
  */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!brand || !name) return; // Do not submit if fields are empty

    await supabase.from("scandb").insert([
      { ItemBrands: brand, ItemName: name, ScannedCode: scannedCode },
    ]);

    // Navigate to HomeUser with form open and name prefilled
    navigate("/HomeUser", {
      state: {
        showForm: true,
        scannedData: `${brand} ${name}`,
      },
    });
  };

  /* 
     Author: Nomusa
     Event: Sprint 2
     LatestUpdate: 28 Sept 2025
     Function: handleEdit
     Description: Enables editing of scannedData
  */
  const handleEdit = () => setIsEditing(true);

  /* 
     Author: Nomusa
     Event: Sprint 2
     LatestUpdate: 28 Sept 2025
     Function: handleCancel
     Description: Navigates two steps back in history
  */
  const handleCancel = () => navigate(-2);

  return (
    <div className="scan-container">
      {notFound ? (
        <div>
          <p>
            Item with barcode <b>{scannedCode}</b> was not found.
          </p>
          <p style={{ color: "gray" }}>
            Please enter the item details in the format: <b>Brand Name</b> (e.g., Albany Bread)
          </p>
          <form onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
            <input
              type="text"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)} // Update brand state on input
              required
              style={{ margin: "5px", padding: "8px" }}
            />
            <input
              type="text"
              placeholder="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)} // Update name state on input
              required
              style={{ margin: "5px", padding: "8px" }}
            />
            <br />
            <button type="submit" style={{ marginTop: "10px", padding: "10px 20px" }}>
              Save Item
            </button>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            {isEditing ? (
              <input
                type="text"
                value={scannedData}
                onChange={(e) => setScannedData(e.target.value)} // Update scannedData during edit
                className="edit-input"
                autoFocus
              />
            ) : (
              scannedData
            )}
          </div>

          <div className="btn-group">
            <button className="btn btn-accept" onClick={handleAccept}>
              ACCEPT
            </button>
            <button className="btn btn-edit" onClick={handleEdit}>
              EDIT
            </button>
            <button className="btn btn-cancel" onClick={handleCancel}>
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Scan;
