import React, { useState } from "react";
import { ref, get } from "firebase/database";
import { db } from "../firebase";

export default function Login({ onLoginSuccess }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the Warden password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Fetch the Warden credentials from Firebase
      const configRef = ref(db, "staff_config/WARDEN");
      const snapshot = await get(configRef);

      if (snapshot.exists()) {
        const config = snapshot.val();
        if (config.password === password) {
          // Success
          sessionStorage.setItem("warden_authenticated", "true");
          onLoginSuccess();
        } else {
          setError("Incorrect password. Please try again.");
        }
      } else {
        // If config node is not initialized yet in DB, default fallback (for first run, say password is "123456" or similar)
        // Or if it doesn't exist, we can prompt the user that no Warden is set up
        setError("Warden configuration not found in Firebase. Please initialize staff config in the mobile app first.");
      }
    } catch (err) {
      console.error(err);
      setError("Database connection error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-header-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
          <span className="logo-badge" style={{ width: "48px", height: "48px", borderRadius: "12px", fontSize: "1.6rem" }}>D</span>
          Dnyanda
        </h1>
        <h2 className="login-header-subtitle">Warden Admin Portal</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: "left" }}>
            <label className="form-label">Warden Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="••••••"
              disabled={loading}
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="toast-msg error" style={{ margin: "1rem 0" }}>
              <span>❌</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginTop: "2rem" }}>
            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div> Authenticating...
                </>
              ) : (
                "LOG IN"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
