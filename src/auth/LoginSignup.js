/* Author: Bethlehem Shimelis
   Event: Sprint 1: Manually Input Food Items with Expiry dates
   LatestUpdate: Established Navigation between User Login and Registration
   parameters: user input
   Description: Handles Navigation for Login and Registration
   Returns: posts to the API backend*/

import { useState } from "react";
import LoginForm from "./Components/LoginForm";
import "./auth.css";

export default function LoginSignup({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-container">
    
        <LoginForm
          goToRegister={() => setIsLogin(false)}
          onLogin={onLogin}
        />
       :
    </div>
  );
}
