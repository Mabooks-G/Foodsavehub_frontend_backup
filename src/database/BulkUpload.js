/* Author: Gift Mabokela
   Event: Sprint 1 
   LatestUpdate: 2025/09/16 : Removed getLoggedInUser dependency
   Description: Handles bulk uploading food items from Excel into DB
*/
import React, { useState } from "react";
import "./BulkUpload.css";
const API_BACKEND = process.env.REACT_APP_API_BACKEND;

export default function BulkUpload({ currentUser }) {
  const [file, setFile] = useState(null); // Store selected file
  const [error, setError] = useState(""); // Store error messages
  const [success, setSuccess] = useState(""); // Store success messages

  /* Author: Gift Mabokela
     Event: Sprint 1
     LatestUpdate: 2025/09/18
     Description: Handle file selection and validation
  */
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    // Return early if no file selected
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith(".xlsx")) {
      setError("Invalid file type. Please upload an Excel (.xlsx) file.");
      setSuccess("");
      setFile(null);
    } else {
      setFile(selectedFile);
      setError("");
      setSuccess("");
    }
  };

  /* Author: Gift Mabokela
     Event: Sprint 1
     LatestUpdate: 2025/09/18 : use onrender for backend
     Description: Handle file upload to server
  */
  const uploadFile = async () => {
    // Check if file is selected
    if (!file) {
      setError("Please choose an Excel (.xlsx) file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // Add user email to form data if available
    if (currentUser?.email) {
      formData.append("email", currentUser.email);
    }

    try {
      // Send POST request to bulk upload API endpoint
      const res = await fetch(`${API_BACKEND}/api/bulkupload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Handle response based on status
      if (res.ok) {
        setSuccess(`${data.count} items uploaded successfully.`);
        setError("");
      } else {
        setError(data.error || "Validation failed");
        setSuccess("");
        // Log validation details if available
        if (data.details) console.warn(data.details);
      }
    } catch (err) {
      setError(`Server error: ${err.message}`);
      setSuccess("");
    }
  };

  return (
    <div className="bulk-container">
      <h2 className="bulk-title">Bulk Upload Excel (.xlsx)</h2>

      <input type="file" accept=".xlsx" onChange={handleFileChange} className="bulk-input" />
      <button onClick={uploadFile} className="bulk-btn">Upload</button>

      {/* Display error message if exists */}
      {error && <div className="bulk-error">{error}</div>}
      
      {/* Display success message if exists */}
      {success && <div className="bulk-success">{success}</div>}
    </div>
  );
}