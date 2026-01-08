import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { getUsers } from "../utils/dataManager";
import { toast } from "react-toastify";

const Login = ({ onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [password, setPassword] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);

  // --- 1. FETCH USERS FROM BACKEND ---
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await getUsers();
        if (Array.isArray(users)) {
          setAvailableUsers(users);
        }
      } catch (error) {
        console.error("Failed to load users", error);
        toast.error("Server Error: Could not load centers.");
      }
    };
    fetchUsers();
  }, []);

  // --- 2. TEMPORARY: CREATE ADMIN USER (Run Once) ---
  // ✅ Ye function missing tha, maine add kar diya hai
  const createInitialAdmin = async () => {
    try {
      const response = await fetch("https://vehicle-backend-seow.onrender.com/api/users/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "admin",
          name: "Super Admin",
          password: "admin",
          role: "admin",
        }),
      });

      if (response.ok) {
        toast.success("Admin User Created! Page Refreshing...");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error("Admin already exists or Error.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Server connection failed.");
    }
  };

  // --- 3. LOGIN HANDLER ---
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select a center.");
      return;
    }

    try {
      const response = await fetch("https://vehicle-backend-seow.onrender.com/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Welcome back, ${data.name}!`);
        onLogin(data);
      } else {
        toast.error(data || "Invalid Password!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Login Failed. Is backend server running?");
    }
  };

  return (
    <div>
      <Navbar />

      <div className="login-container">
        <div className="login-card-3d">
          <h2 className="brand-title">MELLBRO SUGARS</h2>
          <p className="brand-subtitle">Secure Login Portal</p>

          <form onSubmit={handleLogin}>
            <div className="form-group-3d">
              <label style={{ marginLeft: "10px", fontWeight: "bold" }}>
                Select Account
              </label>
              <div className="input-wrapper-3d">
                <select
                  className="form-input-3d"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">-- Select Center / Admin --</option>
                  {availableUsers.map((u) => (
                    <option key={u._id} value={u.userId}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group-3d">
              <label style={{ marginLeft: "10px", fontWeight: "bold" }}>
                Password
              </label>
              <div className="input-wrapper-3d">
                <input
                  className="form-input-3d"
                  type="password"
                  placeholder="Enter Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button className="btn-login-3d" type="submit">
              Access Dashboard
            </button>

            {/* --- TEMPORARY BUTTON --- */}
            {availableUsers.length === 0 && (
              <button
                type="button"
                onClick={createInitialAdmin}
                style={{
                  marginTop: "20px",
                  width: "100%",
                  background: "#e74c3c",
                  color: "white",
                  padding: "10px",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                ⚠️ First Time? Create Admin
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
