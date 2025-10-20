/* Author: Nomusa
   Event: Sprint 2
   LatestUpdate: 18 Oct 2025
   Description: Barcode scanner with full cleanup, proper camera shutdown, and Cancel button.
*/

import React, { useEffect, useRef } from "react";
import Quagga from "quagga";
import { useNavigate } from "react-router-dom";

function orderByOccurrence(arr) {
  const counts = {};
  arr.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
}

export default function QuaggaScanner() {
  const scannerRef = useRef(null);
  const navigate = useNavigate();

  // ✅ Helper to stop camera completely
  const stopCamera = () => {
    try {
      Quagga.stop();
      Quagga.initialized = undefined;

      // Stop all active media tracks
      const video = document.querySelector("video");
      if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
        video.srcObject = null;
        console.log("Camera stream stopped ✅");
      }
    } catch (err) {
      console.warn("Error stopping camera:", err);
    }
  };

  useEffect(() => {
    let lastResults = [];

    function startScanner() {
      if (!scannerRef.current) return;

      if (Quagga.initialized === undefined) {
        Quagga.onDetected((result) => {
          const lastCode = result.codeResult.code;
          if (/^\d{8,13}$/.test(lastCode)) lastResults.push(lastCode);

          if (lastResults.length >= 20) {
            const code = orderByOccurrence(lastResults)[0];
            const lastFive = lastResults.slice(-5);
            if (lastFive.every((c) => c === code)) {
              lastResults = [];
              stopCamera(); // ✅ Close camera before navigation
              navigate("/Scan", { state: { scannedCode: code } });
            }
          }
        });
      }

      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              facingMode: "environment", // rear camera
            },
          },
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "upc_reader",
              "upc_e_reader",
              "code_39_reader",
              "codabar_reader",
            ],
          },
        },
        (err) => {
          if (err) {
            console.error("Quagga init error:", err);
            return;
          }
          Quagga.initialized = true;
          Quagga.start();
        }
      );
    }

    startScanner();

    // ✅ Cleanup when component unmounts
    return () => {
      stopCamera();
    };
  }, [navigate]);

  // ✅ Cancel button — closes camera and goes back
  const handleCancel = () => {
    stopCamera();
    navigate(-1);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        backgroundColor: "black",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Camera container */}
      <div
        id="barcode-scanner"
        ref={scannerRef}
        style={{
          width: "90%",
          height: "70%",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      ></div>

      {/* Cancel button fixed at bottom */}
      <button
        onClick={handleCancel}
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#d9534f",
          color: "white",
          border: "none",
          padding: "12px 28px",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}
      >
        Cancel Scan
      </button>
    </div>
  );
}
