import React, { useState } from "react";
import "../App.css";
import Logo from "../assets/image.png";

const Navbar = ({ user, onLogout, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false); // Mobile Menu State

  return (
    <nav className="navbar">
      {/* --- LEFT SIDE: LOGO & NAME --- */}
      <div className="navbar-brand-wrapper">
        <img src={Logo} alt="Mellbro Sugars Logo" className="navbar-logo" />
        <div className="navbar-title">MELLBRO SUGARS PVT LTD</div>
      </div>

      {/* --- HAMBURGER ICON (Mobile Only) --- */}
      {user && (
        <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? "✖" : "☰"}
        </div>
      )}

      {/* --- RIGHT SIDE: MENU ITEMS --- */}
      {user && (
        <div className={`navbar-menu ${isOpen ? "active" : ""}`}>
          {/* 1. Center User Links */}
          {user.role !== "admin" && (
            <>
              <button
                className="nav-btn btn-outline"
                onClick={() => {
                  onNavigate && onNavigate("dashboard");
                  setIsOpen(false);
                }}
              >
                🏠 Dashboard
              </button>

              <button
                className="nav-btn btn-orange"
                onClick={() => {
                  onNavigate && onNavigate("transfer");
                  setIsOpen(false);
                }}
              >
                ⇄ Transfer Vehicle
              </button>
            </>
          )}

          {/* 2. User Badge */}
          <span className="user-badge">
            {user.role === "admin" ? "👑 Admin Panel" : `🏭 ${user.name}`}
          </span>

          {/* 3. Logout Button */}
          <button
            className="nav-btn btn-red"
            onClick={() => {
              onLogout();
              setIsOpen(false);
            }}
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
