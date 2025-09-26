import React from "react";
import Donor from "./donor";
import Charity from "./charity";

export default function Donations({ currentUser }) {
  if (!currentUser) return <p>Loading user info...</p>;

  // Use the correct field from your login response
  const userId = currentUser.stakeholderID;

  if (!userId) return <p>Loading user info...</p>;

  // Determine user type
  let userType = null;
  if (userId.startsWith("h")) userType = "User";
  else if (userId.startsWith("b")) userType = "Business";
  else if (userId.startsWith("c")) userType = "Charity";

  if (!userType) return <p>Invalid user type</p>;

  // Render based on type
  if (userType === "Charity") return <Charity currentUser={currentUser} />;

  return <Donor currentUser={currentUser} userType={userType} />;
}

