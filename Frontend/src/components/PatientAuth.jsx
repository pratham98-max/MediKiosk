import React, { useState } from "react";

export default function PatientAuth({ onLoginSuccess, apiBase }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Demo account filler for rapid testing
  const fillDemoAccount = () => {
    setMode("login");
    setLoginIdentifier("jane@example.com");
    setLoginPassword("password123");
    setError("");
    setSuccessMsg("Filled with demo patient credentials. Click 'Sign In' below.");
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!loginIdentifier.trim() || !loginPassword) {
      setError("Please enter your email/phone and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/patient/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Login failed. Please check credentials.");
      }

      onLoginSuccess(data.patient);
    } catch (err) {
      setError(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!regFullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!regEmail.trim() && !regPhone.trim()) {
      setError("Please provide either an email or a phone number.");
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/patient/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: regFullName.trim(),
          email: regEmail.trim(),
          phone: regPhone.trim(),
          age: regAge ? parseInt(regAge, 10) : null,
          gender: regGender,
          password: regPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccessMsg("Registration successful! Logging you in...");
      setTimeout(() => {
        onLoginSuccess(data.patient);
      }, 500);
    } catch (err) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Card Header */}
        <div className="auth-header">
          <div className="auth-badge">
            <span>🛡️</span> Patient Self-Check-in
          </div>
          <h2>Welcome to MediKiosk</h2>
          <p>
            Securely access your clinical intake, describe symptoms in your native
            language, and upload medical records.
          </p>
        </div>

        {/* Demo Quick-Fill Ribbon */}
        <div className="demo-banner">
          <span className="demo-pill">Quick Demo</span>
          <span className="demo-text">Want to test right away?</span>
          <button
            type="button"
            className="btn-demo-fill"
            onClick={fillDemoAccount}
          >
            Use Demo Patient
          </button>
        </div>

        {/* Tabs: Login vs Register */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => {
              setMode("login");
              setError("");
              setSuccessMsg("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            onClick={() => {
              setMode("register");
              setError("");
              setSuccessMsg("");
            }}
          >
            Register New Patient
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && <div className="auth-alert error">⚠️ {error}</div>}
        {successMsg && <div className="auth-alert success">✓ {successMsg}</div>}

        {/* LOGIN FORM */}
        {mode === "login" ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-identifier">
                Email Address or Phone Number
              </label>
              <div className="input-with-icon">
                <span className="input-icon">📧</span>
                <input
                  id="login-identifier"
                  type="text"
                  placeholder="e.g. jane@example.com or 9876543210"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-with-icon">
                <span className="input-icon">🔒</span>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Sign In & Start Consultation →"}
            </button>

            <div className="auth-footer-prompt">
              Don&apos;t have a patient profile yet?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                Register here
              </button>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="reg-name">Full Name *</label>
              <div className="input-with-icon">
                <span className="input-icon">👤</span>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label htmlFor="reg-email">Email Address</label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="name@mail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group half">
                <label htmlFor="reg-phone">Phone Number</label>
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="10-digit mobile"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label htmlFor="reg-age">Age</label>
                <input
                  id="reg-age"
                  type="number"
                  placeholder="e.g. 32"
                  min="1"
                  max="125"
                  value={regAge}
                  onChange={(e) => setRegAge(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group half">
                <label htmlFor="reg-gender">Gender</label>
                <select
                  id="reg-gender"
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  disabled={loading}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label htmlFor="reg-password">Password *</label>
                <input
                  id="reg-password"
                  type="password"
                  placeholder="Min 4 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group half">
                <label htmlFor="reg-confirm">Confirm Password *</label>
                <input
                  id="reg-confirm"
                  type="password"
                  placeholder="Repeat password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Register & Start Intake →"}
            </button>

            <div className="auth-footer-prompt">
              Already registered?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setSuccessMsg("");
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
