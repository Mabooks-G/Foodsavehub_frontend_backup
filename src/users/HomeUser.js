import React, { useState } from "react";
import HomeDash from "./HomeComponents/HomeDash";
import HomeForm from "./HomeComponents/HomeForm";
import "./HomeUser.css";

export default function HomeUser({ currentUser }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(false);

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

