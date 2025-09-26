import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import supabase from "../supabaseClient";
import "./charity.css";

// ... same imports and setup ...

const GroceryList = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const foodbank = location.state?.foodbank || { name: "[UserName]" };
  const userId = location.state?.userId || null;

  const [selectedItems, setSelectedItems] = useState([]);
  const [foodItems, setFoodItems] = useState([]);
  const [fetchError, setFetchError] = useState(null);
  const [notification, setNotification] = useState("");
  const [notificationType, setNotificationType] = useState("success");
  const [charityCapacity, setCharityCapacity] = useState(0);

  // Fetch charity capacity
  useEffect(() => {
    const fetchCapacity = async () => {
      if (!foodbank.stakeholderid) return;

      const { data, error } = await supabase
        .from("stakeholderdb")
        .select("capacity")
        .eq("stakeholderid", foodbank.stakeholderid)
        .single();

      if (error) {
        console.error("Error fetching charity capacity:", error);
        return;
      }

      setCharityCapacity(data?.capacity || 0);
    };

    fetchCapacity();
  }, [foodbank.stakeholderid]);

  // Fetch food items
  useEffect(() => {
    if (!userId) {
      setFetchError("No stakeholder ID provided.");
      return;
    }

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from("fooditemdb")
        .select("fooditemid, name, Measure_per_Unit, Unit, quantity, expirydate")
        .eq("stakeholderid", userId);

      if (error) {
        console.error(error);
        setFetchError("Could not fetch food items.");
        setFoodItems([]);
        return;
      }

      const now = new Date();
      const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const filteredItems = (data || []).filter((item) => {
        if (!item.expirydate) return true;
        const expiry = new Date(item.expirydate);
        return expiry > cutoff;
      });

      setFoodItems(filteredItems);
      setFetchError(null);
    };

    fetchItems();
  }, [userId]);

  // Include expiry date in label for uniqueness
  const handleSelect = (item) => {
    const itemLabel = `${item.name} (${item.Measure_per_Unit} ${item.Unit}, quantity: ${item.quantity}, expires: ${item.expirydate ? new Date(item.expirydate).toLocaleDateString() : "N/A"})`;
    setSelectedItems((prev) =>
      prev.includes(itemLabel) ? prev.filter((i) => i !== itemLabel) : [...prev, itemLabel]
    );
  };

  const generateDonationId = async () => {
    try {
      const { data, error } = await supabase
        .from("donationdb")
        .select("donationid")
        .order("donationid", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) return "d001";

      const lastId = data[0].donationid;
      const lastNum = parseInt(lastId.replace("d", ""), 10);
      return `d${String(lastNum + 1).padStart(3, "0")}`;
    } catch (err) {
      console.error("Error generating donation ID:", err);
      return `d${String(Math.floor(1 + Math.random() * 999)).padStart(3, "0")}`;
    }
  };

  // Send donation with capacity check
  const handleSendDonation = async () => {
    if (selectedItems.length === 0) {
      setNotificationType("warning");
      setNotification("Please select at least one item to donate.");
      return;
    }

    try {
      let totalQuantity = 0;

      const itemsToSave = selectedItems.map((label) => {
        // Parse label to get name and expiry date
        const regex = /(.*) \(.+quantity: (\d+), expires: (.+)\)/;
        const match = label.match(regex);
        if (!match) return null;

        const [, name, quantityStr, expiryStr] = match;
        const quantity = parseInt(quantityStr, 10);
        totalQuantity += quantity;

        return {
          name: name.trim(),
          quantity,
          expirydate: new Date(expiryStr),
        };
      }).filter(Boolean);

      if (totalQuantity > charityCapacity) {
        setNotificationType("warning");
        setNotification(
          `Selected items (${totalQuantity}) exceed the capacity (${charityCapacity}) of ${foodbank.name}.`
        );
        return;
      }

      const newDonationId = await generateDonationId();

      const { data, error } = await supabase
        .from("donationdb")
        .insert([
          {
            donationid: newDonationId,
            donationstatus: "pending",
            charityid: foodbank.stakeholderid,
            stakeholderid: userId,
            donation_items: itemsToSave,
          },
        ])
        .select();

      if (error) {
        console.error("Error inserting donation:", error);
        setNotificationType("warning");
        setNotification("Could not send donation. Please try again.");
        return;
      }

      setNotificationType("success");
      setNotification(`Donation sent to ${foodbank.name}`);
      setSelectedItems([]);
    } catch (err) {
      console.error("Unexpected error:", err);
      setNotificationType("warning");
      setNotification("Something went wrong.");
    }
  };

  return (
    <div className="grocery-container">
      <button className="back-btn" onClick={() => navigate("/donor")}>
        ← Back
      </button>

      <h3>Donate to {foodbank.name}</h3>
      <h3><em>Select items to donate</em></h3>

      {fetchError && <p>{fetchError}</p>}

      <div className="food-list green-bg">
        {foodItems.map((item) => {
          const itemLabel = `${item.name} (${item.Measure_per_Unit} ${item.Unit}, quantity: ${item.quantity}, expires: ${item.expirydate ? new Date(item.expirydate).toLocaleDateString() : "N/A"})`;
          return (
            <label key={item.fooditemid} className="food-item">
              <input
                type="checkbox"
                checked={selectedItems.includes(itemLabel)}
                onChange={() => handleSelect(item)}
              />
              {itemLabel}
            </label>
          );
        })}
      </div>

      {notification && (
        <div className={`inline-notification ${notificationType}`}>
          {notification}
        </div>
      )}

      <button className="btn-send" onClick={handleSendDonation}>
        Send Donation
      </button>
    </div>
  );
};

export default GroceryList;
