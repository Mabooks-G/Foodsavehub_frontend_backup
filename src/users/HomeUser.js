import React, { useState, useEffect } from "react";
import HomeDash from "./HomeComponents/HomeDash";
import HomeForm from "./HomeComponents/HomeForm";
import { useLocation } from "react-router-dom";
import "./HomeUser.css";

export default function HomeUser({ currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const location = useLocation();

  // Capture scannedData if navigated from Scan.js
  const scannedData = location.state?.scannedData || "";

  // 👇 Automatically open HomeForm if scannedData is present
  useEffect(() => {
    if (scannedData) {
      setShowForm(true);
    }
  }, [scannedData]);

  const handleAddNew = () => setShowForm(true);
  const handleCloseForm = () => {
    setShowForm(false);
    setRefreshFlag(!refreshFlag); // refresh dashboard after adding item
  };

  return (
    <div className="dashboard-container">
      {showForm ? (
        <HomeForm
          currentUser={currentUser}
          onClose={handleCloseForm}
          onRefresh={() => setRefreshFlag(!refreshFlag)}
          scannedData={scannedData} // pass it here
        />
      ) : (
        <HomeDash
          currentUser={currentUser}
          onAddNew={handleAddNew}
          refreshFlag={refreshFlag}
        />
      )}
    </div>
  );
}

