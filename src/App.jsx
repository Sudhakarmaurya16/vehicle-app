// import React, { useState, useEffect } from "react";
// import Login from "./components/Login";
// import AdminDashboard from "./components/AdminDashboard";
// import CenterDashboard from "./components/CenterDashboard";
// import TransferDashboard from "./components/TransferDashboard"; // <--- Import New Component
// import Footer from "./components/Footer";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import "./App.css";

// function App() {
//   const [user, setUser] = useState(null);
//   // View State: 'dashboard' is default
//   const [currentView, setCurrentView] = useState("dashboard");

//   useEffect(() => {
//     const savedUser = localStorage.getItem("sugar_current_user");
//     if (savedUser) setUser(JSON.parse(savedUser));
//   }, []);

//   const handleLogin = (userData) => {
//     setUser(userData);
//     localStorage.setItem("sugar_current_user", JSON.stringify(userData));
//     setCurrentView("dashboard"); // Reset view on login
//   };

//   const handleLogout = () => {
//     setUser(null);
//     localStorage.removeItem("sugar_current_user");
//     setCurrentView("dashboard");
//   };

//   return (
//     <div
//       style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
//     >
//       <ToastContainer position="top-right" autoClose={3000} />

//       <div style={{ flex: 1 }}>
//         {!user ? (
//           <Login onLogin={handleLogin} />
//         ) : user.role === "admin" ? (
//           <AdminDashboard onLogout={handleLogout} />
//         ) : (
//           // --- LOGIC FOR CENTERS ---
//           // Agar 'dashboard' hai to CenterDashboard, warna TransferDashboard
//           <>
//             {currentView === "dashboard" ? (
//               <CenterDashboard
//                 user={user}
//                 onLogout={handleLogout}
//                 onNavigate={setCurrentView} // Pass navigation function
//               />
//             ) : (
//               <TransferDashboard
//                 user={user}
//                 onLogout={handleLogout}
//                 onNavigate={setCurrentView} // Pass navigation function
//               />
//             )}
//           </>
//         )}
//       </div>

//       <Footer />
//     </div>
//   );
// }

// export default App;

import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard";
import CenterDashboard from "./components/CenterDashboard";
import TransferDashboard from "./components/TransferDashboard";
import LiveFactoryDashboard from "./components/LiveFactoryDashboard"; // <--- 1. NEW IMPORT
import Footer from "./components/Footer";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  // View State: 'dashboard' is default
  const [currentView, setCurrentView] = useState("dashboard");

  useEffect(() => {
    const savedUser = localStorage.getItem("sugar_current_user");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("sugar_current_user", JSON.stringify(userData));
    setCurrentView("dashboard"); // Reset view on login
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("sugar_current_user");
    setCurrentView("dashboard");
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <ToastContainer position="top-right" autoClose={3000} />

      <div style={{ flex: 1 }}>
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : user.role === "admin" ? (
          // --- 2. ADMIN SECTION MODIFIED ---
          <>
            {currentView === "live" ? (
              // SHOW LIVE DASHBOARD (Full Screen Mode)
              <div
                style={{
                  backgroundColor: "#000",
                  minHeight: "100vh",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setCurrentView("dashboard")}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    zIndex: 1000,
                    padding: "8px 15px",
                    backgroundColor: "red",
                    color: "white",
                    border: "none",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  ✖ Close Monitor
                </button>
                <LiveFactoryDashboard />
              </div>
            ) : (
              // SHOW NORMAL ADMIN DASHBOARD
              <div style={{ position: "relative" }}>
                {/* Temporary Button to Switch to Live View */}
                <div
                  style={{
                    textAlign: "right",
                    padding: "10px",
                    background: "#f4f4f4",
                  }}
                >
                  <button
                    onClick={() => setCurrentView("live")}
                    style={{
                      backgroundColor: "#d32f2f",
                      color: "white",
                      border: "none",
                      padding: "8px 15px",
                      cursor: "pointer",
                      borderRadius: "4px",
                      fontWeight: "bold",
                    }}
                  >
                    🔴 Show Live Factory Monitor
                  </button>
                </div>

                <AdminDashboard
                  onLogout={handleLogout}
                  onNavigate={setCurrentView} // Pass navigate in case you want to use it inside
                />
              </div>
            )}
          </>
        ) : (
          // --- LOGIC FOR CENTERS (Existing) ---
          <>
            {currentView === "dashboard" ? (
              <CenterDashboard
                user={user}
                onLogout={handleLogout}
                onNavigate={setCurrentView}
              />
            ) : (
              <TransferDashboard
                user={user}
                onLogout={handleLogout}
                onNavigate={setCurrentView}
              />
            )}
          </>
        )}
      </div>

      {/* Only show Footer if NOT in Live View (kyunki Live View full screen accha lagta hai) */}
      {currentView !== "live" && <Footer />}
    </div>
  );
}

export default App;
