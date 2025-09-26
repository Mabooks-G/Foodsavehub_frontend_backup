import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import "./charity.css";

const Donor = ({ currentUser, userType }) => {
  const currentUserId = currentUser.stakeholderID;
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [donationUpdates, setDonationUpdates] = useState([]);
  const [popupVisible, setPopupVisible] = useState(false); // mimic Charity popup
  const navigate = useNavigate();

  // Fetch charities in same region
  useEffect(() => {
    const fetchCharities = async () => {
      if (!currentUserId) return;

      try {
        const { data: userData } = await supabase
          .from("stakeholderdb")
          .select("region")
          .eq("stakeholderid", currentUserId)
          .maybeSingle();

        const { data: charityData } = await supabase
          .from("stakeholderdb")
          .select("*")
          .like("stakeholderid", "c%")
          .eq("region", userData?.region);

        setCharities(charityData || []);
      } catch (err) {
        console.error("Error fetching charities:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCharities();
  }, [currentUserId]);

  // Subscribe to donation updates
  useEffect(() => {
    if (!currentUserId) return;

    const subscription = supabase
      .channel("donation-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "donationdb",
          filter: `donorid=eq.${currentUserId}`,
        },
        async (payload) => {
          const { donationstatus, donationid, charityid, donation_items } =
            payload.new || {};

          const { data: charity } = await supabase
            .from("stakeholderdb")
            .select("name")
            .eq("stakeholderid", charityid)
            .maybeSingle();

          let message = "";
          if (donationstatus === "approved") {
            const items = (donation_items || []).map((i) => i.name).join(", ");
            message = `${charity?.name || charityid} has accepted your donation${
              items ? ` (${items})` : ""
            }.`;
          } else if (donationstatus === "unapproved") {
            message = `${charity?.name || charityid} has declined your donation.`;
          } else {
            message = `${charity?.name || charityid} updated donation ${donationid} (${donationstatus}).`;
          }

          setDonationUpdates((prev) => [
            ...prev.filter((d) => d.donationid !== donationid),
            { donationid, message },
          ]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, [currentUserId]);

  const handleDonate = (charity) => {
    navigate("/grocerylist", {
      state: { foodbank: charity, userId: currentUserId },
    });
  };

  if (loading) return <p>Loading charities...</p>;

  return (
    <div>

      <h2 id="donations-title">Donations</h2>
  
      {/* Donation notifications (mimicking Charity popup) */}
      <div className="chat-notification">
        <div
          className="notification-bubble"
          onClick={() => setPopupVisible(!popupVisible)}
        >
          {/*{donationUpdates.length}*/}
        </div>
        {popupVisible && (
          <div className="notification-popup">
            {donationUpdates.length === 0 ? (
              <p>No recent updates</p>
            ) : (
              donationUpdates.map((update) => (
                <p key={update.donationid}>{update.message}</p>
              ))
            )}
          </div>
        )}
      </div>

      <div className="offer-container">
        <p></p>
        <p> <em>Donate to a food bank, <strong> {currentUser?.name} </strong> </em> </p>

        <div className="search-bar">
          <input type="text" placeholder="Search charities (sprint 2)..." />
        </div>

        <div id="offers-list">
          {charities.length === 0 ? (
            <p>No charities found in your region.</p>
          ) : (
            charities.map((charity, index) => (
              <div
                key={charity.stakeholderid}
                className={`offer-item ${
                  index % 2 === 0 ? "green-bg" : "white-bg"
                }`}
              >
                <div className="offer-details">
                  <h4>{charity.name}</h4>
                  <p>{charity.region}</p>
                </div>
                <div className="offer-actions">
                  <button
                    className="btn btn-donate"
                    onClick={() => handleDonate(charity)}
                  >
                    {userType === "Business" ? "Offer Donation" : "Donate"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Donor;
