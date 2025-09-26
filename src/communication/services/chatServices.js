// src/services/chatServices.js
// THIS FILE MUST HAVE THE PATHS CHANGED TO THE BACKEND SERVER

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added backend call to retrieve stakeholder ID
   Description: Fetches the stakeholderid for a given email from the backend
*/
const API_BACKEND = process.env.REACT_APP_API_BACKEND;
export const getStakeholderId = async (email) => {
  const res = await fetch(`${API_BACKEND}/supabase/getStakeholderId`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error: ${res.status} ${text}`);
  }

  return res.json();
};

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added user chat fetching
   Description: Retrieves all chats for a user since an optional timestamp
*/
export async function getUserChats(email, since = null) {
  const res = await fetch(`${API_BACKEND}/supabase/getUserChats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, since }),
  });

  if (!res.ok) throw new Error("Failed to fetch user chats");
  return res.json();
}

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added chat update function
   Description: Sends a new chat message (ciphertext + iv) to the backend
*/
export async function updateChatHistory(donationid, senderid, chathistory, iv = null, message_timestamp = null) {
  const requestBody = { 
    donationid, 
    senderid, 
    chathistory, 
    iv,
    message_timestamp: message_timestamp || new Date().toISOString() // fallback
  };
  
  console.log('Sending to backend:', requestBody);
  
  const res = await fetch(`${API_BACKEND}/supabase/updateChatHistory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Backend error details:', text);
    throw new Error(`Failed to update chat history: ${res.status} ${text}`);
  }

  return res.json();
}

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added read receipt marking
   Description: Marks all messages as read for a donation, excluding the current user
*/
export async function markChatRead(donationid, currentUserId) {
  const res = await fetch(`${API_BACKEND}/supabase/markChatRead`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donationid, currentUserId }),
  });

  if (!res.ok) throw new Error("Failed to mark chat read");
  return res.json();
}

/* Author: Lethabo Mazui
   Event: Sprint 1
   LatestUpdate: Added delivery receipt marking
   Description: Marks all messages as delivered for a donation, excluding the sender
*/
export async function markDelivered(donationid, userId) {
  const res = await fetch(`${API_BACKEND}/supabase/markDelivered`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ donationid, userId }),
  });

  if (!res.ok) throw new Error("Failed to mark delivered");
  return res.json();
}
