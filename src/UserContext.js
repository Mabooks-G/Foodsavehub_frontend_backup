// UserContext.js
import React, { createContext, useContext, useState, useEffect } from "react";

// Create context
const UserContext = createContext(null);

// Provider component
export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem("loggedInUser");
    return stored ? JSON.parse(stored) : null;
  });

  // Persist changes in localStorage
  useEffect(() => {
    if (currentUser) localStorage.setItem("loggedInUser", JSON.stringify(currentUser));
    else localStorage.removeItem("loggedInUser");
  }, [currentUser]);

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for consuming context
export const useUser = () => useContext(UserContext);
