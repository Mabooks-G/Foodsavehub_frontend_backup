import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./Profile.css";

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


export default function User({ currentUser }) {
  const [userData, setUserData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [changePassword, setChangePassword] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [message, setMessage] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [regionSearch, setRegionSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (currentUser) {
      setUserData(currentUser);
      setFormData({
        name: currentUser.name,
        region: currentUser.region,
        capacity: currentUser.capacity || "",
        password: "",
        confirmPassword: ""
      });
      setRegionSearch(currentUser.region);
      setPushNotifications(currentUser.push_notifications === 1);
    }
  }, [currentUser]);

  const filteredRegions = useMemo(() => {
    return regions.filter(r =>
      r.toLowerCase().includes(regionSearch.toLowerCase())
    );
  }, [regionSearch]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    if (e.target.name === "password") {
      const pwd = e.target.value;
      let strength = 0;
      if (pwd.length >= 8) strength += 25;
      if (/[A-Z]/.test(pwd)) strength += 25;
      if (/[a-z]/.test(pwd)) strength += 25;
      if (/\d/.test(pwd)) strength += 12.5;
      if (/[!@#$%^&*]/.test(pwd)) strength += 12.5;
      setPasswordStrength(strength);
    }
  };

  const handleRegionSelect = (region) => {
    setFormData(prev => ({ ...prev, region }));
    setRegionSearch(region);
    setShowDropdown(false);
  };

  const handleEditToggle = () => {
    setEditing(!editing);
    setMessage("");
    setOtpMessage("");
    setChangePassword(false);
    setOtpStep(false);
    setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
    setPasswordStrength(0);
  };

  const handleSendOtp = async () => {
    try {
      await axios.post(`${API_BACKEND}/api/auth/request-otp`, { email: userData.email });
      setOtpStep(true);
      setOtpMessage("OTP sent!");
      setResendCooldown(30);
    } catch (err) {
      console.error(err);
      setOtpMessage(err.response?.data?.error || "Failed to send OTP");
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const verifyOtp = async () => {
    try {
      await axios.post(`${API_BACKEND}/api/auth/verify-otp`, { email: userData.email, otp });
      setOtpStep(false);
      setOtpMessage("OTP verified! Enter new password.");
    } catch (err) {
      console.error(err);
      setOtpMessage(err.response?.data?.error || "OTP verification failed");
    }
  };

  const handleSave = async () => {
    setMessage("");

    if (changePassword) {
      if (!formData.password || formData.password !== formData.confirmPassword) {
        setMessage("Passwords do not match or are empty!");
        return;
      }
      const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        setMessage("Password must be 8+ chars, include uppercase, lowercase, number & special char.");
        return;
      }
    }

    try {
      const payload = {
        email: userData.email,
        name: formData.name,
        region: formData.region,
        push_notifications: pushNotifications ? 1 : 0
      };
      if (userData.stakeholderID?.startsWith("c")) payload.capacity = Number(formData.capacity);
      if (changePassword && formData.password) payload.newPassword = formData.password;

      const res = await axios.put(`${API_BACKEND}/api/profile/update`, payload);
      setUserData(res.data.user);
      setEditing(false);
      setChangePassword(false);
      setMessage("Profile updated successfully!");
      setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setPasswordStrength(0);
      setOtpMessage("");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.error || "Failed to update profile.");
    }
  };

  if (!userData) return <p>Loading...</p>;

  return (
    <div className="profile-page">
      <div className="profile-card">
        <h2>User Profile</h2>

        <div className="profile-row">
          <label>Email:</label>
          <span>{userData.email}</span>
        </div>

        <div className="profile-row">
          <label>Name:</label>
          {editing ? (
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-field"/>
          ) : <span>{userData.name}</span>}
        </div>

        <div className="profile-row">
          <label>Region:</label>
          {editing ? (
            <div className="region-search-container">
              <input type="text" placeholder="Search Region..." value={regionSearch}
                onChange={(e) => {
                  setRegionSearch(e.target.value);
                  setFormData(prev => ({ ...prev, region: e.target.value }));
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                className="input-field"
              />
              {showDropdown && filteredRegions.length > 0 && (
                <div className="region-dropdown">
                  {filteredRegions.map((r, i) => (
                    <div key={i} className="region-option" onClick={() => handleRegionSelect(r)}>{r}</div>
                  ))}
                </div>
              )}
            </div>
          ) : <span>{userData.region}</span>}
        </div>

        {userData.stakeholderID?.startsWith("c") && (
          <div className="profile-row">
            <label>Capacity:</label>
            {editing ? (
              <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="input-field"/>
            ) : <span>{userData.capacity}</span>}
          </div>
        )}

        {editing && (
          <>
            <div className="profile-row slider-row">
              <label>Allow Push Notifications:</label>
              <label className="switch">
                <input type="checkbox" checked={pushNotifications} onChange={() => setPushNotifications(!pushNotifications)}/>
                <span className="slider"></span>
              </label>
            </div>

            <div className="profile-row slider-row">
              <label>Change Password:</label>
              <label className="switch">
                <input type="checkbox" checked={changePassword} onChange={() => setChangePassword(!changePassword)}/>
                <span className="slider"></span>
              </label>
            </div>

            {changePassword && !otpStep && (
              <button className="btn otp-btn" type="button" onClick={handleSendOtp}>
                {otpMessage ? <span className="otp-success">{otpMessage}</span> : "Send OTP"}
              </button>
            )}

            {otpStep && (
              <div className="profile-row">
                <label>Enter OTP:</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} className="input-field"/>
                <button type="button" onClick={verifyOtp} disabled={!otp}>Verify OTP</button>
              </div>
            )}

            {changePassword && !otpStep && (
              <>
                <div className="profile-row">
                  <label>New Password:</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="input-field"/>
                  <div className="password-strength">
                    <div className="password-bar" style={{ width: `${passwordStrength}%` }}></div>
                  </div>
                </div>
                <div className="profile-row">
                  <label>Confirm Password:</label>
                  <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="input-field"/>
                </div>
              </>
            )}
          </>
        )}

        <div className="profile-actions">
          {editing ? (
            <>
              <button className="btn btn-save" onClick={handleSave}>Save</button>
              <button className="btn btn-cancel" onClick={handleEditToggle}>Cancel</button>
            </>
          ) : (
            <button className="btn btn-edit" onClick={handleEditToggle}>Edit Profile</button>
          )}
        </div>

        {message && <p className="profile-message">{message}</p>}
      </div>
    </div>
  );
}
