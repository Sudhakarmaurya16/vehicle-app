import React from "react";
import "../App.css";
import Logo from "../assets/image.png"; // ✅ Import Logo

const Navbar = ({ user, onLogout, onNavigate }) => {
  return (
    <nav className="navbar">
      {/* ✅ Logo aur Text Container */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* 🌟 LOGO WITH 3D EFFECT & CIRCLE */}
        <img
          src={Logo}
          alt="Mellbro Sugars Logo"
          style={{
            height: "50px", // Height
            width: "50px", // Width (Equal to make it perfect circle)
            borderRadius: "50%", // Circle Shape
            objectFit: "cover", // Image fit rahegi, kategi nahi
            border: "2px solid #fff", // White border for clean look
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.5)", // 🔥 3D Shadow Effect
            cursor: "pointer",
          }}
        />

        <div className="navbar-brand">MELLBRO SUGARS PRIVATE LIMITED</div>
      </div>

      {/* Right Side */}
      {user && (
        <div
          className="navbar-right"
          style={{ display: "flex", alignItems: "center", gap: "15px" }}
        >
          {/* Navigation Links (Only for Centers, not Admin) */}
          {user.role !== "admin" && (
            <>
              <button
                onClick={() => onNavigate && onNavigate("dashboard")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.5)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                }}
              >
                🏠 Dashboard
              </button>

              <button
                onClick={() => onNavigate && onNavigate("transfer")}
                style={{
                  background: "#f39c12", // Orange color for attention
                  border: "none",
                  color: "white",
                  padding: "6px 15px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                }}
              >
                ⇄ Transfer Vehicle
              </button>
            </>
          )}

          {/* User Badge */}
          <span className="user-badge">
            {user.role === "admin" ? "👑 Admin Panel" : `🏭 ${user.name}`}
          </span>

          {/* Logout Button */}
          <button
            className="logout-btn"
            style={{
              background: "#e74c3c",
              color: "white",
              border: "none",
              padding: "8px 15px",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
