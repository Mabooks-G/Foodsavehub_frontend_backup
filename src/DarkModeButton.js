// DarkModeButton.js
import React, { useEffect } from "react";

export default function DarkModeButton() {
  useEffect(() => {
    const savedMode = localStorage.getItem("dark-mode");
    if (savedMode === "true") document.body.classList.add("dark-mode");
  }, []);

  const toggleDarkMode = () => {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("dark-mode", isDark);
  };

  return (
    <button
      className="dark-mode-toggle"
      onClick={toggleDarkMode}
      title="Toggle Dark Mode"
    >
      🌞
    </button>
  );
}
