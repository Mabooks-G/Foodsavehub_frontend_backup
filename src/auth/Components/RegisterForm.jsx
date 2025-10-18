/* Author: Bethlehem Shimelis
   Event: Sprint 1: Manually Input Food Items with Expiry dates
   LatestUpdate: Added conditional capacity field with fade-in for charity users
   Parameters: 
      goToLogin (function) - callback to switch to login form
      onLogin (function) - callback after successful registration
   Description: Handles user registration, posts credentials to API backend, validates input, manages conditional capacity field
   Returns: Updates success/error messages, invokes onLogin callback
*/

/* RegisterForm.jsx */
// This component handles user registration including OTP verification for email confirmation.
// It also has a fun animated background of food emojis to reinforce the “FoodSave” theme.

import { useState, useMemo } from "react";
import axios from "axios";
import "../auth.css";

// Base URL for backend API, pulled from environment variables for flexibility
const API_BACKEND = process.env.REACT_APP_API_BACKEND;

// Predefined list of regions for dropdown/autocomplete. Could be extended in future.
const regions = [ 
  "Durban, KwaZulu-Natal",
  "Cape Town, Western Cape",
  "Pretoria, Gauteng",
  "Johannesburg, Gauteng",
  "Port Elizabeth (Gqeberha), Eastern Cape",
  "Bloemfontein, Free State",
  "Nelspruit (Mbombela), Mpumalanga",
  "Kimberley, Northern Cape",
  "Potchefstroom, North West",
  "Polokwane, Limpopo",
  "George, Western Cape",
  "East London, Eastern Cape",
  "Welkom, Free State",
  "Mthatha, Eastern Cape",
  "Stellenbosch, Western Cape",
  "Pietermaritzburg, KwaZulu-Natal"
];

// Array of emojis representing food items. Used for the animated background.
const donationEmojis = [
  "🍎","🍌","🍊","🍐","🍉","🍇","🍓",
  "🥕","🌽","🥔","🥦","🥬","🧄","🧅",
  "🍞","🥖","🥯","🥐",
  "🥚","🧀","🥛",
  "🥫","🫙","🍲","🥣",
  "🍚","🍝","🌾",
  "🥜","🌰",
  "🍯","🍼",
  "🧺",
  "🍪","🍫"
];

export default function RegisterForm({ goToLogin, onLogin }) {
  // State to hold all form fields
  const [form, setForm] = useState({
    accountType: "Household/Individual", // default account type
    name: "",
    email: "",
    region: "",
    password: "",
    capacity: "", // Only relevant for charity accounts
  });

  const [otp, setOtp] = useState("");             // OTP input from user
  const [isOtpStep, setIsOtpStep] = useState(false); // Tracks if we are in OTP verification step
  const [error, setError] = useState("");         // Holds error messages
  const [success, setSuccess] = useState("");     // Holds success messages
  const [regionSearch, setRegionSearch] = useState(form.region); // For autocomplete input
  const [showDropdown, setShowDropdown] = useState(false);       // Show/hide region dropdown

  // Filter regions based on user input using useMemo for performance optimization
  const filteredRegions = useMemo(() => {
    return regions.filter(r =>
      r.toLowerCase().includes(regionSearch.toLowerCase())
    );
  }, [regionSearch]);

  // Generic handler for input changes (name, email, password, etc.)
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Called when user selects a region from the dropdown
  const handleRegionSelect = (region) => {
    setForm((prev) => ({ ...prev, region })); // Update form region
    setRegionSearch(region);                  // Update input value
    setShowDropdown(false);                   // Hide dropdown
  };

  // Main submit handler for both registration and OTP verification
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 
    setSuccess("");

    if (!isOtpStep) {
      // ---------- REGISTRATION STEP ----------
      // Validate capacity for charity users
      if (
        form.accountType === "Charity/Foodbank" &&
        (!form.capacity || isNaN(form.capacity) || Number(form.capacity) < 0)
      ) {
        setError("Please enter a valid capacity for charity users");
        return;
      }

      try {
        // Prepare payload for registration API
        const payload = {
          accountType: form.accountType,
          name: form.name,
          email: form.email,
          password: form.password,
          region: form.region,
          capacity: form.accountType === "Charity/Foodbank" ? Number(form.capacity) : undefined,
        };
        const res = await axios.post(`${API_BACKEND}/api/auth/register`, payload);

        setSuccess("Registration successful! Check your email for the OTP.");
        setIsOtpStep(true); // Move to OTP verification step
      } catch (err) {
        // Handle errors from backend
        setError(err.response?.data?.error || "Something went wrong. Try again.");
      }
    } else {
      // ---------- OTP VERIFICATION STEP ----------
      try {
        const res = await axios.post(`${API_BACKEND}/api/auth/verify-otp`, {
          email: form.email,
          otp
        });
        setSuccess(res.data.message || "Email verified successfully!");
        setError("");
        if (onLogin) onLogin(res.data.user); // Trigger callback to log user in
      } catch (err) {
        setError(err.response?.data?.error || "Invalid OTP, please try again.");
      }
    }
  };

  // Generate a floating emoji background for fun animation
  const emojiSpans = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const emoji = donationEmojis[i % donationEmojis.length];
      const left = Math.random() * 100;       // Random horizontal position
      const duration = 10 + Math.random() * 6; // Random float duration
      const delay = Math.random() * 10;       // Random animation delay
      return (
        <span
          key={i}
          className="food-item"
          style={{
            left: `${left}%`,
            fontSize: "60px",
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
            opacity: 0,
            animationFillMode: "forwards",
          }}
        >
          {emoji}
        </span>
      );
    });
  }, []);

  return (
    <div className="login-page">
      {/* Animated emoji background */}
      <div className="food-background">{emojiSpans}</div>

      {/* Main registration/login form card */}
      <div className="login-card-wrapper">
        <form onSubmit={handleSubmit} className="form-card">

          {/* Header/logo section */}
          <div className="form-header">
            <div className="logo-icon">🧺</div>
            <h1 className="app-title">FoodSave Hub</h1>
            <p className="subtitle">
              <em>Recreate, Donate, and Reduce Food Waste</em>
            </p>
          </div>

          {!isOtpStep && (
            <>
              {/* Account type selection */}
              <select
                name="accountType"
                value={form.accountType}
                onChange={handleChange}
                className="input-field"
              >
                <option>Household/Individual</option>
                <option>Business/Corporate</option>
                <option>Charity/Foodbank</option>
              </select>

              {/* Standard input fields */}
              <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} className="input-field" required />
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="input-field" required />
              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="input-field" required />

              {/* Region search/autocomplete */}
              <div className="region-search-container">
                <input
                  type="text"
                  placeholder="Search Region..."
                  value={regionSearch}
                  onChange={(e) => {
                    setRegionSearch(e.target.value);
                    setForm((prev) => ({ ...prev, region: e.target.value }));
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 1000)}
                  className="region-search-input"
                />
                {showDropdown && filteredRegions.length > 0 && (
                  <div className="region-dropdown">
                    {filteredRegions.map((r, i) => (
                      <div key={i} onClick={() => handleRegionSelect(r)} className="region-option">{r}</div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conditional capacity field for charities */}
              <div className={`charity-container ${form.accountType === "Charity/Foodbank" ? "visible" : ""}`}>
                <p className="charity-prompt"><em>Please indicate a maximum quantity of goods you can receive</em></p>
                <input type="number" name="capacity" placeholder="Capacity" value={form.capacity} min="0" onChange={handleChange} className="input-field" required={form.accountType === "Charity/Foodbank"} />
              </div>
            </>
          )}

          {/* OTP input field only visible after registration step */}
          {isOtpStep && (
            <input type="text" name="otp" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="input-field" required />
          )}

          {/* Display any error or success messages */}
          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          {/* Submit button changes text depending on step */}
          <button type="submit" className="primary-btn">
            {!isOtpStep ? "Create Account" : "Verify OTP"}
          </button>

          {/* Link to switch to login form */}
          {!isOtpStep && <button type="button" className="toggle-link" onClick={goToLogin}>Already have an account? Login</button>}
        </form>
      </div>
    </div>
  );
}
