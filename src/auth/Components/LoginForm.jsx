/* Author: Bethlehem Shimelis
   Event: Sprint 2: User Registration Security + Verification, User Profile
   LatestUpdate: Established User Login and Registration with OTP, Added Push Notifications default
   Description: Processes User requests for Login, Registration, Password Change, and Sign Up with visual feedback
*/

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import '../auth.css';

const API_BACKEND = process.env.REACT_APP_API_BACKEND;

// ===== Food emoji background for login vibe =====
const foodEmojis = [
  '🍎','🍌','🍊','🍐','🍉','🍇','🍓',
  '🥕','🌽','🥔','🥦','🥬','🧄','🧅',
  '🍞','🥖','🥯','🥐',
  '🥚','🧀','🥛',
  '🥫','🫙','🍲','🥣',
  '🍚','🍝','🌾',
  '🥜','🌰',
  '🍯','🍼','🧺',
  '🍪','🍫'
];

// ===== Predefined regions for registration =====
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

export default function LoginForm({ onLogin }) {
  // ===== State Management =====
  const [step, setStep] = useState("login"); 
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "", name: "", accountType: "Household/Individual", region: "", capacity: ""
  });
  const [otp, setOtp] = useState("");                     // Stores OTP input
  const [error, setError] = useState("");                // Error message displayed to user
  const [success, setSuccess] = useState("");            // Success message displayed
  const [emojiIndex, setEmojiIndex] = useState(0);       // Rotates emoji logo
  const [resendCooldown, setResendCooldown] = useState(0);// OTP resend timer
  const [regionSearch, setRegionSearch] = useState(form.region); // Autocomplete input for region
  const [showDropdown, setShowDropdown] = useState(false);       // Toggles region dropdown
  const [isOtpVerified, setIsOtpVerified] = useState(false);     // Flag for OTP verification
  const [passwordStrengthScore, setPasswordStrengthScore] = useState(0); // Password strength indicator
  const [passwordError, setPasswordError] = useState("");         // Detailed password error
  const [changePasswordMode, setChangePasswordMode] = useState(false); // Forgot password flow
  const [loading, setLoading] = useState(false);                  // Loading screen state

  // ===== Effects =====
  // Rotate the logo emoji every second
  useEffect(() => {
    const interval = setInterval(() => setEmojiIndex(prev => (prev + 1) % foodEmojis.length), 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown for OTP resend button
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Filter regions for the autocomplete dropdown
  const filteredRegions = useMemo(() => {
    return regions.filter(r => r.toLowerCase().includes(regionSearch.toLowerCase()));
  }, [regionSearch]);

  // ===== Input Handlers =====
  /** Update form state when inputs change */
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === "password") checkPasswordStrength(e.target.value);
  };

  /** Update OTP input state */
  const handleOtpChange = (e) => setOtp(e.target.value);

  /** Select a region from the dropdown */
  const handleRegionSelect = (region) => {
    setForm(prev => ({ ...prev, region }));
    setRegionSearch(region);
    setShowDropdown(false);
  };

  // ===== Password Strength Checker =====
  /** Checks if a password meets security requirements */
  const checkPasswordStrength = (pwd) => {
    const rules = [
      pwd.length >= 8,
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /\d/.test(pwd),
      /[@$!%*?&^#()\-_=+{}[\]|;:"<>,./?]/.test(pwd)
    ];
    const score = rules.filter(Boolean).length;
    setPasswordStrengthScore(score);
    setPasswordError(score === rules.length ? "" : "Password must meet all requirements.");
    return score === rules.length;
  };

  // ===== Authentication Functions =====
  /** Log in the user */
  const handleLogin = async () => {
    setLoading(true); // show overlay
    try {
      const res = await axios.post(`${API_BACKEND}/api/auth/login`, { email: form.email, password: form.password });
      setSuccess("Login successful!");
      if (onLogin) onLogin(res.data.user);
      localStorage.setItem("loggedInUser", JSON.stringify(res.data.user));
    } catch (loginErr) {
      const msg = loginErr.response?.data?.error || "Login failed";
      setError(msg.includes("Wrong Password") ? "Password is incorrect" : msg);
    } finally {
      setLoading(false);
    }
  };

  /** Request OTP for email verification */
  const requestOtp = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BACKEND}/api/auth/request-otp`, { email: form.email });
      setSuccess("OTP sent! Check your email (spam).");
      setStep("otp-verify");
      setResendCooldown(30);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  /** Verify the OTP entered by the user */
  const verifyOtp = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BACKEND}/api/auth/verify-otp`, { email: form.email, otp });
      setSuccess(res.data.message || "OTP verified successfully!");
      setStep(changePasswordMode ? "change-password" : "register");
      setIsOtpVerified(true);
    } catch (err) {
      setError(err.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  /** Register a new user */
  const registerUser = async () => {
    if (!isOtpVerified) return setError("Please verify your OTP first.");
    if (!checkPasswordStrength(form.password)) return;

    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        name: form.name,
        accountType: form.accountType,
        region: form.region,
        capacity: form.accountType === "Charity/Foodbank" ? Number(form.capacity) : -1
      };
      const res = await axios.post(`${API_BACKEND}/api/auth/register`, payload);
      setSuccess("Registration successful!");
      setError("");
      if (onLogin && res.data.user) onLogin(res.data.user);
      localStorage.setItem("loggedInUser", JSON.stringify(res.data.user));
      setStep("login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  /** Change the user's password */
  const handleChangePassword = async () => {
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (!checkPasswordStrength(form.password)) return setError("Password is not secure enough.");

    setLoading(true);
    try {
      const res = await axios.put(`${API_BACKEND}/api/profile/update`, {
        email: form.email,
        newPassword: form.password
      });
      setSuccess(res.data.message || "Password updated successfully!");
      setStep("login");
      setChangePasswordMode(false);
      setForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  /** Unified submit handler for all steps */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (step === "login") await handleLogin();
    else if (step === "otp-email") await requestOtp();
    else if (step === "otp-verify") await verifyOtp();
    else if (step === "register") await registerUser();
    else if (step === "change-password") await handleChangePassword();
  };

  /** Resend OTP if cooldown is finished */
  const handleResend = () => {
    if (resendCooldown <= 0) requestOtp();
  };

  // ===== Emoji Background JSX =====
  const emojiSpans = useMemo(() => {
    return Array.from({ length: 100 }, (_, i) => {
      const emoji = foodEmojis[i % foodEmojis.length];
      const left = Math.random() * 100;
      const duration = 10 + Math.random() * 6;
      const delay = Math.random() * 10;
      return (
        <span key={i} className="food-item" style={{
          left: `${left}%`, fontSize: '60px',
          animationDuration: `${duration}s`, animationDelay: `${delay}s`,
          opacity: 0, animationFillMode: 'forwards'
        }}>{emoji}</span>
      );
    });
  }, []);

  return (
    <div className="login-page">
      {/* Floating food emoji background */}
      <div className="food-background">{emojiSpans}</div>

      <div className="login-card-wrapper">
        {loading ? (
          // ===== Loading Overlay =====
          <div className="loading-screen">
            <div className="spinner"></div>
            Loading...
          </div>
        ) : (
          // ===== Main Form =====
          <form onSubmit={handleSubmit} className="form-card">
            <div className="form-header">
              <div className="logo-icon" style={{ fontSize: '3rem' }}>{foodEmojis[emojiIndex]}</div>
              <h1 className="app-title">
                {step === "login" && "FoodSave Hub"}
                {step === "otp-email" && "Sign Up - Enter Email"}
                {step === "otp-verify" && "Enter OTP"}
                {step === "register" && "Complete Registration"}
                {step === "change-password" && "Change Password"}
              </h1>
              <p className="subtitle">
                {step === "login" && <em>Recreate, Donate, and Reduce Food Waste</em>}
                {step === "otp-email" && "Enter your email to receive OTP"}
                {step === "otp-verify" && "Check your email for the OTP"}
                {step === "register" && <em>Fill in your details to complete registration</em>}
                {step === "change-password" && "Enter and confirm your new password"}
              </p>
            </div>

            {/* ===== Inputs per Step ===== */}
            {step === "login" && <>
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="input-field" required />
              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="input-field" required />
              <button type="button" className="toggle-link" onClick={() => { setStep("otp-email"); setChangePasswordMode(true); }}>Forgot Password?</button>
            </>}

            {step === "otp-email" && <>
              <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="input-field" required />
            </>}

            {step === "otp-verify" && <>
              <input type="text" name="otp" placeholder="Enter OTP" value={otp} onChange={handleOtpChange} className="input-field" required />
              <button type="button" className="toggle-link" onClick={handleResend} disabled={resendCooldown > 0}>
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
              </button>
            </>}

            {(step === "register" || step === "change-password") && <>
              { step === "register" && <>
                <select name="accountType" value={form.accountType} onChange={handleChange} className="input-field">
                  <option>Household/Individual</option>
                  <option>Business/Corporate</option>
                  <option>Charity/Foodbank</option>
                </select>

                <input type="text" name="name" placeholder="Name" value={form.name} onChange={handleChange} className="input-field" required />

                <div className="region-search-container">
                  <input 
                    type="text" 
                    placeholder="Search Region..." 
                    value={regionSearch} 
                    onChange={(e)=>{ setRegionSearch(e.target.value); setForm(prev=>({...prev, region:e.target.value})); setShowDropdown(true); }}
                    onFocus={()=>setShowDropdown(true)}
                    onBlur={()=>setTimeout(()=>setShowDropdown(false),1000)} 
                    className="region-search-input"
                  />
                  {showDropdown && filteredRegions.length > 0 && (
                    <div className="region-dropdown">
                      {filteredRegions.map((r,i) => (
                        <div key={i} className="region-option" onClick={()=>handleRegionSelect(r)}>{r}</div>
                      ))}
                    </div>
                  )}
                </div>

                {form.accountType==="Charity/Foodbank" && 
                  <input type="number" name="capacity" placeholder="Capacity" value={form.capacity} min="0" onChange={handleChange} className="input-field" required />
                }
              </>}

              <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="input-field" required />
              <input type="password" name="confirmPassword" placeholder="Confirm Password" value={form.confirmPassword || ""} onChange={handleChange} className="input-field" required />

              <div className="password-bar-container">
                <div className="password-bar" style={{
                  width: `${(passwordStrengthScore / 5) * 100}%`,
                  backgroundColor: passwordStrengthScore < 3 ? 'red' : passwordStrengthScore < 5 ? 'orange' : 'green'
                }}></div>
              </div>

              <p className="strength-text">
                {passwordStrengthScore < 3 && "Weak"} 
                {passwordStrengthScore >= 3 && passwordStrengthScore < 5 && "Medium"} 
                {passwordStrengthScore === 5 && "Strong"}
              </p>

              <ul className="password-rules">
                <li className={form.password.length >= 8 ? "valid" : ""}>Minimum 8 characters</li>
                <li className={/[a-z]/.test(form.password) ? "valid" : ""}>Lowercase letter</li>
                <li className={/[A-Z]/.test(form.password) ? "valid" : ""}>Uppercase letter</li>
                <li className={/\d/.test(form.password) ? "valid" : ""}>Number</li>
                <li className={/[@$!%*?&^#()\-_=+{}[\]|;:"<>,./?]/.test(form.password) ? "valid" : ""}>Special character</li>
              </ul>
            </>}

            {error && <p className="error-msg">{error}</p>}
            {success && <p className="success-msg">{success}</p>}

            <button type="submit" className="primary-btn">
              {step==="login" && "Login"}
              {step==="otp-email" && "Request OTP"}
              {step==="otp-verify" && "Verify OTP"}
              {step==="register" && "Complete Registration"}
              {step==="change-password" && "Update Password"}
            </button>

            {step==="login" && <button type="button" className="toggle-link" onClick={()=>setStep("otp-email")}>Don't have an account? Sign Up</button>}
            {(step==="otp-email" || step==="otp-verify" || step==="register" || step==="change-password") && <button type="button" className="toggle-link" onClick={()=>setStep("login")}>Back to Login</button>}

          </form>
        )}
      </div>
    </div>
  );
}
