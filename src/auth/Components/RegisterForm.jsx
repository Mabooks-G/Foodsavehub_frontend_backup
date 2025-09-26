/* Author: Bethlehem Shimelis
   Event: Sprint 1: Manually Input Food Items with Expiry dates
   LatestUpdate: Added conditional capacity field with fade-in for charity users
   Parameters: 
      goToLogin (function) - callback to switch to login form
      onLogin (function) - callback after successful registration
   Description: Handles user registration, posts credentials to API backend, validates input, manages conditional capacity field
   Returns: Updates success/error messages, invokes onLogin callback
*//* RegisterForm.jsx */
import { useState, useMemo } from "react";
import axios from "axios";
import "../auth.css";

const API_BACKEND = process.env.REACT_APP_API_BACKEND;

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
  const [form, setForm] = useState({
    accountType: "Household/Individual",
    name: "",
    email: "",
    region: "",
    password: "",
    capacity: "",
  });
  const [otp, setOtp] = useState("");       
  const [isOtpStep, setIsOtpStep] = useState(false); 
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [regionSearch, setRegionSearch] = useState(form.region);
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredRegions = useMemo(() => {
    return regions.filter(r =>
      r.toLowerCase().includes(regionSearch.toLowerCase())
    );
  }, [regionSearch]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegionSelect = (region) => {
    setForm((prev) => ({ ...prev, region }));
    setRegionSearch(region);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (!isOtpStep) {
      // Registration step
      if (
        form.accountType === "Charity/Foodbank" &&
        (!form.capacity || isNaN(form.capacity) || Number(form.capacity) < 0)
      ) {
        setError("Please enter a valid capacity for charity users");
        return;
      }

      try {
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
        setIsOtpStep(true); // move to OTP verification
      } catch (err) {
        setError(err.response?.data?.error || "Something went wrong. Try again.");
      }
    } else {
      // OTP verification step
      try {
        const res = await axios.post(`${API_BACKEND}/api/auth/verify-otp`, {
          email: form.email,
          otp
        });
        setSuccess(res.data.message || "Email verified successfully!");
        setError("");
        if (onLogin) onLogin(res.data.user);
      } catch (err) {
        setError(err.response?.data?.error || "Invalid OTP, please try again.");
      }
    }
  };

  const emojiSpans = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const emoji = donationEmojis[i % donationEmojis.length];
      const left = Math.random() * 100;
      const duration = 10 + Math.random() * 6;
      const delay = Math.random() * 10;
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
      <div className="food-background">{emojiSpans}</div>

      <div className="login-card-wrapper">
        <form onSubmit={handleSubmit} className="form-card">
          <div className="form-header">
            <div className="logo-icon">🧺</div>
            <h1 className="app-title">FoodSave Hub</h1>
            <p className="subtitle">
              <em>Recreate, Donate, and Reduce Food Waste</em>
            </p>
          </div>

          {!isOtpStep && (
            <>
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

              <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} className="input-field" required />
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="input-field" required />
              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="input-field" required />

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

              <div className={`charity-container ${form.accountType === "Charity/Foodbank" ? "visible" : ""}`}>
                <p className="charity-prompt"><em>Please indicate a maximum quantity of goods you can receive</em></p>
                <input type="number" name="capacity" placeholder="Capacity" value={form.capacity} min="0" onChange={handleChange} className="input-field" required={form.accountType === "Charity/Foodbank"} />
              </div>
            </>
          )}

          {isOtpStep && (
            <input type="text" name="otp" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="input-field" required />
          )}

          {error && <p className="error-msg">{error}</p>}
          {success && <p className="success-msg">{success}</p>}

          <button type="submit" className="primary-btn">
            {!isOtpStep ? "Create Account" : "Verify OTP"}
          </button>
          {!isOtpStep && <button type="button" className="toggle-link" onClick={goToLogin}>Already have an account? Login</button>}
        </form>
      </div>
    </div>
  );
}
