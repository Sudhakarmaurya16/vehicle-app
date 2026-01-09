import React, { useState, useEffect } from "react";
// ❌ Navbar hata diya (App.js wala dikhega)
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

  // 🔒 SECURITY FIX: createInitialAdmin function hata diya gaya hai.

  // --- 2. LOGIN HANDLER ---
  const handleLogin = async (e) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select a center.");
      return;
    }

    try {
      const response = await fetch(
        "https://vehicle-backend-seow.onrender.com/api/users/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            password: password,
          }),
        }
      );

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
      {/* Navbar yahan se hata diya hai taaki double na dikhe */}

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

            {/* 🔒 SECURITY FIX: Admin Create Button hata diya gaya hai */}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
