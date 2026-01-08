import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import {
  addRecord,
  getRecords,
  updateRecord,
  getUsers,
} from "../utils/dataManager";
import { toast } from "react-toastify";

const TransferDashboard = ({ user, onLogout, onNavigate }) => {
  const [activeTab, setActiveTab] = useState("send"); // 'send' or 'history'
  const [centers, setCenters] = useState([]);
  const [transferForm, setTransferForm] = useState({
    receiverId: "",
    vehicleNo: "",
    driverMobile: "",
    notes: "",
  });

  // Data Lists
  const [sentHistory, setSentHistory] = useState([]);
  const [receivedHistory, setReceivedHistory] = useState([]);

  // Popup State
  const [showPopup, setShowPopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);

  // --- INITIAL LOAD & POLLING ---
  useEffect(() => {
    loadData();
    // Poll for new transfer requests every 10 seconds (increased from 5s to reduce load)
    const interval = setInterval(checkForIncomingTransfers, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  // --- LOAD DATA FROM API ---
  const loadData = async () => {
    try {
      // 1. Get Users & Records in parallel
      const [allUsers, allRecords] = await Promise.all([
        getUsers(),
        getRecords(),
      ]);

      // Filter other centers
      const otherCenters = (allUsers || []).filter(
        (u) => u.role === "center" && (u.userId || u.id) !== user.id
      );
      setCenters(otherCenters);

      // Filter Records
      const records = allRecords || [];

      // Sent by me
      const sent = records.filter(
        (r) => r.recordType === "TRANSFER" && r.senderId === user.id
      );
      // Sort: Newest first (Assuming Mongo _id or createdAt timestamp)
      sent.reverse();
      setSentHistory(sent);

      // Received by me
      const received = records.filter(
        (r) => r.recordType === "TRANSFER" && r.receiverId === user.id
      );
      received.reverse();
      setReceivedHistory(received);

      // Check for notifications
      checkForIncomingTransfers(received);
    } catch (error) {
      console.error("Error loading transfer data:", error);
    }
  };

  // --- NOTIFICATION LOGIC ---
  const checkForIncomingTransfers = async (preLoadedRecords = null) => {
    let source = preLoadedRecords;

    // If not preloaded, fetch fresh data (for polling)
    if (!source) {
      try {
        const allRecords = await getRecords();
        source = allRecords.filter(
          (r) => r.recordType === "TRANSFER" && r.receiverId === user.id
        );
      } catch (e) {
        return; // Silent fail on poll error
      }
    }

    // Find latest PENDING request
    const pending = source.find((r) => r.status === "PENDING");

    if (pending) {
      setCurrentNotification(pending);
      setShowPopup(true);
    }
  };

  // --- HANDLERS ---
  const handleChange = (e) => {
    setTransferForm({ ...transferForm, [e.target.name]: e.target.value });
  };

  const handleSendTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.receiverId) {
      toast.error("Select a Center to send vehicle!");
      return;
    }

    const receiverObj = centers.find(
      (c) => (c.userId || c.id) === transferForm.receiverId
    );
    const receiverName = receiverObj ? receiverObj.name : "Unknown";

    const newTransfer = {
      recordType: "TRANSFER",
      senderId: user.id,
      senderName: user.name,
      receiverId: transferForm.receiverId,
      receiverName: receiverName,
      vehicleNo: transferForm.vehicleNo.toUpperCase(),
      mobileNo: transferForm.driverMobile, // Using standard field name
      // notes: transferForm.notes, // Add 'notes' to Record Schema if needed
      arrivalDate: new Date().toISOString().split("T")[0], // Standard date
      status: "PENDING", // Initial Status (Need to ensure schema supports 'status' or add mixed type)
      centerId: user.id, // Required by schema
      centerName: user.name, // Required by schema
      transportCode: "TRF-OUT", // Placeholder
      transporterName: "Self Transfer", // Placeholder
    };

    // NOTE: Your current Record Schema might strict validation.
    // Ideally, update Record.js schema to include 'status', 'senderId', 'receiverId'.
    // Or store these in a flexible 'meta' field.
    // For now, assuming you added these fields to Record.js schema as per previous steps context.

    try {
      await addRecord(newTransfer); // API CALL
      toast.success("Vehicle Sent Successfully!");
      setTransferForm({
        receiverId: "",
        vehicleNo: "",
        driverMobile: "",
        notes: "",
      });
      loadData();
    } catch (error) {
      toast.error("Failed to send transfer request");
    }
  };

  const handleAccept = async () => {
    if (!currentNotification) return;

    try {
      // 1. Update Transfer Record Status
      const updatedRecord = { ...currentNotification, status: "ACCEPTED" };
      await updateRecord(updatedRecord); // API CALL

      // 2. Auto-create an Arrival Entry in my dashboard
      const newArrival = {
        recordType: "GATE_ENTRY",
        centerId: user.id,
        centerName: user.name,
        vehicleNo: currentNotification.vehicleNo,
        transporterName: `Transfer from ${currentNotification.senderName}`,
        transportCode: "TRF-IN",
        jobCode: "TRANSFER",
        arrivalDate: new Date().toISOString().split("T")[0],
        vehicleCount: "1",
        mobileNo:
          currentNotification.mobileNo || currentNotification.driverMobile,
        vehicleType: "Tractor", // Default
      };

      await addRecord(newArrival); // API CALL

      toast.success("Vehicle Accepted & Added to Arrival!");
      setShowPopup(false);
      setCurrentNotification(null);
      loadData();
    } catch (error) {
      toast.error("Operation failed");
    }
  };

  const handleReject = async () => {
    if (!currentNotification) return;
    try {
      const updatedRecord = { ...currentNotification, status: "REJECTED" };
      await updateRecord(updatedRecord); // API CALL

      toast.warn("Vehicle Transfer Rejected");
      setShowPopup(false);
      setCurrentNotification(null);
      loadData();
    } catch (error) {
      toast.error("Update failed");
    }
  };

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} />

      {/* --- POPUP MODAL --- */}
      {showPopup && currentNotification && (
        <div style={modalOverlayStyle}>
          <div style={modalContentStyle}>
            <h2 style={{ color: "#d35400" }}>🔔 Incoming Vehicle Alert!</h2>
            <hr />
            <p>
              <strong>From Center:</strong> {currentNotification.senderName}
            </p>
            <p>
              <strong>Vehicle No:</strong> {currentNotification.vehicleNo}
            </p>
            <p>
              <strong>Driver Mobile:</strong>{" "}
              {currentNotification.mobileNo || currentNotification.driverMobile}
            </p>
            <p>
              <strong>Date Sent:</strong> {currentNotification.arrivalDate}
            </p>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleAccept}
                className="btn-save"
                style={{ padding: "10px 20px" }}
              >
                ✅ Accept Vehicle
              </button>
              <button
                onClick={handleReject}
                className="btn-delete"
                style={{ padding: "10px 20px" }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {/* TABS */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setActiveTab("send")}
            className="btn-submit"
            style={{ background: activeTab === "send" ? "#3498db" : "#bdc3c7" }}
          >
            📤 Send Vehicle
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className="btn-submit"
            style={{
              background: activeTab === "history" ? "#8e44ad" : "#bdc3c7",
            }}
          >
            📜 Transfer History
          </button>
        </div>

        {/* --- SEND FORM --- */}
        {activeTab === "send" && (
          <div className="form-card">
            <h3>🚚 Transfer Vehicle to Another Circle</h3>
            <form onSubmit={handleSendTransfer}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Select Receiver Circle</label>
                  <select
                    name="receiverId"
                    className="form-control"
                    value={transferForm.receiverId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Center --</option>
                    {centers.map((c) => (
                      <option key={c._id || c.id} value={c.userId || c.id}>
                        {c.name} ({c.userId || c.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle No</label>
                  <input
                    name="vehicleNo"
                    className="form-control"
                    placeholder="MP09AB1234"
                    value={transferForm.vehicleNo}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Driver Mobile</label>
                  <input
                    name="driverMobile"
                    className="form-control"
                    type="number"
                    value={transferForm.driverMobile}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <input
                    name="notes"
                    className="form-control"
                    value={transferForm.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <button
                className="btn-submit"
                style={{ width: "100%", background: "#3498db" }}
              >
                Send Request 🚀
              </button>
            </form>
          </div>
        )}

        {/* --- HISTORY TABLES --- */}
        {activeTab === "history" && (
          <div className="dashboard-grid">
            {/* SENT TABLE */}
            <div className="form-card">
              <h4 style={{ color: "#3498db" }}>📤 Sent by Me</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>To</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentHistory.map((r) => (
                      <tr key={r._id || r.id}>
                        <td>{r.receiverName}</td>
                        <td>{r.vehicleNo}</td>
                        <td>
                          <span style={getStatusStyle(r.status)}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RECEIVED TABLE */}
            <div className="form-card">
              <h4 style={{ color: "#8e44ad" }}>📥 Received Requests</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivedHistory.map((r) => (
                      <tr key={r._id || r.id}>
                        <td>{r.senderName}</td>
                        <td>{r.vehicleNo}</td>
                        <td>
                          <span style={getStatusStyle(r.status)}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalContentStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "10px",
  width: "400px",
  textAlign: "center",
  boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
};

const getStatusStyle = (status) => {
  switch (status) {
    case "ACCEPTED":
      return { color: "green", fontWeight: "bold" };
    case "REJECTED":
      return { color: "red", fontWeight: "bold" };
    default:
      return { color: "orange", fontWeight: "bold" };
  }
};

export default TransferDashboard;
