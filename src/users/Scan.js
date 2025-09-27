Scan.js

// src/users/Scan.js
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";
import "./Scan.css";

function Scan({ currentUser }) {
  const navigate = useNavigate();
  const [scannedData, setScannedData] = useState("Scanned Item (Autofill)");
  const [isEditing, setIsEditing] = useState(false);
  const [scanning, setScanning] = useState(true); // controls camera view
  const scannerRef = useRef(null);

  // Use environment variable for API key
  const apiKey = process.env.REACT_APP_BARCODE_API_KEY;

  useEffect(() => {
    if (!scanning || !scannerRef.current) return;

    const html5QrcodeScanner = new Html5Qrcode("reader");

    html5QrcodeScanner
      .start(
        { facingMode: "environment" }, // back camera
        { fps: 10, qrbox: { width: 250, height: 250 } }, // scanning config
        async (decodedText) => {
          console.log("Scanned barcode:", decodedText);

          // Stop scanning after first successful scan
          await html5QrcodeScanner.stop();
          setScanning(false);

          // Call BarcodeLookup API
          try {
            const res = await axios.get(
              "https://api.barcodelookup.com/v3/products",
              {
                params: {
                  barcode: decodedText,
                  formatted: "y",
                  key: apiKey,
                },
              }
            );

            const productName = res.data.products?.[0]?.product_name || decodedText;
            setScannedData(productName);
          } catch (err) {
            console.error("Barcode API error:", err);
            setScannedData(decodedText); // fallback
          }
        },
        (errorMessage) => {
          console.warn("Scan error:", errorMessage);
        }
      )
      .catch((err) => {
        console.error("Camera start error:", err);
        setScanning(false);
      });

    // Cleanup on unmount
    return () => {
      html5QrcodeScanner.stop().catch(() => {});
    };
  }, [scanning, apiKey]);

  // - sends scanned data back to HomeForm or any target page
  const handleAccept = () => {
    navigate("/HomeUser", { state: { scannedData } });
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => navigate(-1); // go back

  return (
    <div className="scan-container">
      {scanning && (
        <div
          id="reader"
          style={{ width: "300px", height: "300px", margin: "auto" }}
          ref={scannerRef}
        ></div>
      )}

      {!scanning && (
        <div className="card">
          <div className="card-header">
            {isEditing ? (
              <input
                type="text"
                value={scannedData}
                onChange={(e) => setScannedData(e.target.value)}
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
