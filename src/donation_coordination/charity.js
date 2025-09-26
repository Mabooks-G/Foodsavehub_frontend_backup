import React, { useEffect, useState } from "react";
import supabase from "../supabaseClient";
import "./charity.css";

const Charity = ({ currentUser }) => {
  const [offers, setOffers] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [recentActions, setRecentActions] = useState([]); // to display approved/declined messages

  useEffect(() => {
    const fetchDonations = async () => {
      if (!currentUser?.stakeholderID) return;

      try {
        // Step 1: Get pending donations for this charity
        const { data: donationData, error: donationError } = await supabase
          .from("donationdb")
          .select("*")
          .eq("charityid", currentUser.stakeholderID)
          .eq("donationstatus", "pending");

        if (donationError) throw donationError;

        // Step 2: Map donation data to offers
        const offersMapped = await Promise.all(
          (donationData || []).map(async (donation) => {
            // Get donor info
            const { data: donorData } = await supabase
              .from("stakeholderdb")
              .select("name, stakeholderid")
              .eq("stakeholderid", donation.stakeholderid)
              .single();

            const accountType = donation.stakeholderid.startsWith("h")
              ? "Household"
              : "Business";

            // Prepare item list
            const donationItems = donation.donation_items || []; // JSON column
            const quantities = await Promise.all(
              donationItems.map(async (item) => {
                const { data: foodData } = await supabase
                  .from("fooditemdb")
                  .select("Measure_per_Unit, Unit")
                  .eq("stakeholderid", donation.stakeholderid)
                  .eq("name", item.name)
                  .single();
                return foodData
                  ? `${item.name}, ${foodData.Measure_per_Unit} ${foodData.Unit}`
                  : item.name;
              })
            );

            return {
              id: donation.donationid,
              user: donorData?.name || "Unknown",
              accountType,
              quantity: quantities.join(" | "),
              listed: new Date().toLocaleDateString(), // today's date
            };
          })
        );

        setOffers(offersMapped);
      } catch (err) {
        console.error("Error fetching donations:", err);
      }
    };

    fetchDonations();
  }, [currentUser]);

  // Helper: show recent actions for 24h
  const addAction = (message) => {
    const timestamp = Date.now();
    setRecentActions((prev) => [...prev, { message, timestamp }]);
    setTimeout(() => {
      setRecentActions((prev) =>
        prev.filter((m) => m.timestamp !== timestamp)
      );
    }, 24 * 60 * 60 * 1000); // 24h
  };

const handleAccept = async (offer) => {
  try {
    // Step 1: Update donation status
    const { error: updateError } = await supabase
      .from("donationdb")
      .update({ donationstatus: "approved" })
      .eq("donationid", offer.id);

    if (updateError) throw updateError;

    // Step 2: Get the full donation record (to access stakeholderid + items)
    const { data: donationData, error: fetchError } = await supabase
      .from("donationdb")
      .select("stakeholderid, donation_items")
      .eq("donationid", offer.id)
      .single();

    if (fetchError) throw fetchError;

    const donorId = donationData.stakeholderid;
    const items = donationData.donation_items || [];

    // Step 3: Delete each donated item from fooditemdb
    for (const item of items) {
      const { error: deleteError } = await supabase
        .from("fooditemdb")
        .delete()
        .eq("stakeholderid", donorId)
        .eq("name", item.name);

      if (deleteError) {
        console.error(`Failed to delete ${item.name}`, deleteError);
      }
    }

    // Step 4: Add success message + refresh offers list
    addAction(`Approved donation from ${offer.user}`);
    setOffers((prev) => prev.filter((o) => o.id !== offer.id));
  } catch (err) {
    console.error(err);
    alert("Could not approve donation. Try again.");
  }
};


  const handleDecline = async (offer) => {
    try {
      const { error } = await supabase
        .from("donationdb")
        .update({ donationstatus: "unapproved" })
        .eq("donationid", offer.id);

      if (error) throw error;

      addAction(`Declined donation from ${offer.user}`);
      // Refresh offers list
      setOffers((prev) => prev.filter((o) => o.id !== offer.id));
    } catch (err) {
      console.error(err);
      alert("Could not decline donation. Try again.");
    }
  };

  return (
    <div>
      <h2 id="donations-title">Donations</h2>
  
      {/* Notification bubble */}
      <div className="chat-notification">
        <div
          className="notification-bubble"
          onClick={() => setPopupVisible(!popupVisible)}
        >
         {/* {offers.length} */}
        </div>
        {popupVisible && (
          <div className="notification-popup">
            <p>"looking forward to it"</p>
            <p>"when can I drop it off?"</p>
          </div>
        )}
      </div>

      {/* Recent actions (approved/declined) */}
      <div className="recent-actions">
        {recentActions.map((action, index) => (
          <p key={index}>{action.message}</p>
        ))}
      </div>

      <div className="offer-container">
        <h3>{currentUser?.name || "Charity"}</h3>
        <p> Current offers : {offers.length} </p>
        <p> <em> Accept or Decline Offers </em> </p>

        <div className="search-bar">
          <input type="text" placeholder="Search offers (sprint 2)..." />
        </div>

        <div id="offers-list">
          {offers.map((offer, index) => (
            <div
              key={offer.id}
              className={`offer-item ${
                index % 2 === 0 ? "green-bg" : "white-bg"
              }`}
            >
              <div className="offer-details">
                <h4>
                  {offer.user} - {offer.accountType}
                </h4>
                <p>{offer.quantity}</p>
                <p>listed: {offer.listed}</p>
              </div>
              <div className="offer-actions">
                <button
                  className="btn btn-accept"
                  onClick={() => handleAccept(offer)}
                >
                  ACCEPT
                </button>
                <button
                  className="btn btn-decline"
                  onClick={() => handleDecline(offer)}
                >
                  DECLINE
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Charity;
