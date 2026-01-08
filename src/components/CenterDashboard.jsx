import React, { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "./Navbar";
import {
  addRecord,
  getRecords,
  deleteRecord,
  getMasterData,
  addMasterDataBulk,
  clearMasterDataDB,
} from "../utils/dataManager";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "react-toastify";

const CenterDashboard = ({ user, onLogout, onNavigate }) => {
  const jobCodes = [
    "MHA",
    "KBH",
    "SELF HRV",
    "MHA-W / A",
    "LOCAL",
    "MHA-CART",
    "LOCAL-W / A",
    "OF-Hosapet",
    "Hrv Machine",
    "HOSAPET",
    "MHF",
    "Hrv Machine (Firm)",
    "NULL",
  ];

  const vehicleTypes = [
    "Tractor",
    "Truck",
    "Bullock Cart",
    "Harvester",
    "Other",
  ];
  const recordsPerPage = 5;

  const [activeTab, setActiveTab] = useState("entry");
  const fileInputRef = useRef(null);
  const masterInputRef = useRef(null);

  // ✅ STATS STATE
  const [stats, setStats] = useState({
    arrival: 0,
    dispatch: 0,
    unloaded: 0,
    pendingUnload: 0,
    nonWorking: 0,
  });

  // --- MASTER DATA STATE ---
  const [masterRecords, setMasterRecords] = useState([]);
  const [masterSearchTerm, setMasterSearchTerm] = useState("");
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  // Global Records
  const [allSystemRecords, setAllSystemRecords] = useState([]);

  // Forwarding State
  const [forwardingId, setForwardingId] = useState(null);

  // Forms
  const [entryForm, setEntryForm] = useState({
    transportCode: "",
    transporterName: "",
    jobCode: "MHA",
    vehicleType: "Tractor",
    arrivalDate: "",
    endDate: "",
    vehicleCount: "1",
    vehicleNo: "",
    mobileNo: "",
  });

  const [loadingForm, setLoadingForm] = useState({
    transportCode: "",
    transporterName: "",
    jobCode: "MHA",
    vehicleType: "Tractor",
    date: "",
    endDate: "",
    vehicleCount: "1",
    vehicleNo: "",
    mobileNo: "",
  });

  const [myRecords, setMyRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // --- LOAD DATA ---
  useEffect(() => {
    if (user && user.userId) {
      loadMyRecords();
    }
    loadMasterData();
  }, [user?.userId, activeTab]);

  const loadMasterData = async () => {
    try {
      const data = await getMasterData();
      setMasterRecords(data || []);
    } catch (e) {
      console.error("Master data load error", e);
    }
  };

  const loadMyRecords = async () => {
    if (!user || !user.userId) return;

    try {
      const allRecords = await getRecords();
      setAllSystemRecords(allRecords);

      // 1. Filter My Records
      const myArrivals = allRecords.filter(
        (r) => r.centerId === user.userId && r.recordType === "GATE_ENTRY"
      );
      const myDispatches = allRecords.filter(
        (r) => r.centerId === user.userId && r.recordType === "LOADING"
      );

      // 2. Calculate Counts

      // 🚜 Total Arrival (Cumulative Entry)
      const arrivalCount = myArrivals.reduce(
        (acc, r) => acc + Number(r.vehicleCount || 0),
        0
      );

      // 🚚 Load Vehicle (Cumulative Dispatch)
      const dispatchCount = myDispatches.reduce(
        (acc, r) => acc + Number(r.vehicleCount || 0),
        0
      );

      // ✅ Unload Vehicle (Completed at Factory)
      const unloadedCount = myDispatches.reduce(
        (acc, r) => acc + (Number(r.manualUnload) || 0),
        0
      );

      // ⏳ Pending of Unloading (Dispatched but not yet Unloaded)
      const pendingUnloadCount = Math.max(0, dispatchCount - unloadedCount);

      // ⛔ Non Working (Gate pe khadi gaadi = Arrival - Dispatch)
      const nonWorkingCount = Math.max(0, arrivalCount - dispatchCount);

      // 3. Set Stats
      setStats({
        arrival: arrivalCount,
        dispatch: dispatchCount,
        unloaded: unloadedCount,
        pendingUnload: pendingUnloadCount,
        nonWorking: nonWorkingCount,
      });

      // 4. Set Table Data
      if (activeTab !== "master") {
        let recordsToShow = [];
        if (activeTab === "entry") {
          // Show only those arrivals which are NOT yet dispatched
          recordsToShow = myArrivals.filter((arrival) => {
            const isDispatched = myDispatches.some(
              (dispatch) =>
                dispatch.vehicleNo === arrival.vehicleNo &&
                dispatch.arrivalDate === arrival.arrivalDate
            );
            return !isDispatched;
          });
        } else if (activeTab === "loading") {
          recordsToShow = myDispatches;
        }

        recordsToShow.reverse();
        setMyRecords(recordsToShow);
        setFilteredRecords(recordsToShow);
      }
    } catch (error) {
      console.error("Error loading records:", error);
    }
  };

  useEffect(() => {
    let results = myRecords;
    if (searchTerm !== "") {
      const lower = searchTerm.toLowerCase();
      results = results.filter(
        (r) =>
          (r.vehicleNo && r.vehicleNo.toLowerCase().includes(lower)) ||
          (r.transporterName &&
            r.transporterName.toLowerCase().includes(lower)) ||
          (r.transportCode && r.transportCode.toLowerCase().includes(lower))
      );
    }
    setFilteredRecords(results);
    setCurrentPage(1);
  }, [searchTerm, myRecords]);

  // --- HANDLERS ---
  const handleChange = (e, formType) => {
    const { name, value } = e.target;
    let val = value;
    if (name === "transportCode" || name === "vehicleNo")
      val = value.toUpperCase();
    if (formType === "entry") setEntryForm({ ...entryForm, [name]: val });
    else setLoadingForm({ ...loadingForm, [name]: val });
  };

  const saveEntryRecord = async (data) => {
    try {
      const newRecord = {
        ...data,
        centerId: user.userId,
        centerName: user.name,
        recordType: "GATE_ENTRY",
      };
      await addRecord(newRecord);
      setEntryForm({
        transportCode: "",
        transporterName: "",
        jobCode: "MHA",
        vehicleType: "Tractor",
        arrivalDate: "",
        endDate: "",
        vehicleCount: "1",
        vehicleNo: "",
        mobileNo: "",
      });
      toast.success("Arrival Entry Saved Successfully!");
      loadMyRecords();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save entry");
    }
  };

  const handleEntrySubmit = (e) => {
    e.preventDefault();
    saveEntryRecord(entryForm);
  };

  const handleLoadingSubmit = async (e) => {
    e.preventDefault();
    try {
      const newRecord = {
        ...loadingForm,
        centerId: user.userId,
        centerName: user.name,
        recordType: "LOADING",
        arrivalDate: loadingForm.date,
      };

      await addRecord(newRecord);

      // 🛠️ FIX: Do NOT delete the Arrival Record. Just clear the ID.
      // Pehle yahan 'deleteRecord' tha, isliye Arrival ghat raha tha.
      if (forwardingId) {
        setForwardingId(null);
        toast.info("Vehicle Dispatched successfully!");
      }

      setLoadingForm({
        transportCode: "",
        transporterName: "",
        jobCode: "MHA",
        vehicleType: "Tractor",
        date: "",
        endDate: "",
        vehicleCount: "1",
        vehicleNo: "",
        mobileNo: "",
      });
      loadMyRecords();
    } catch (error) {
      toast.error("Failed to save dispatch");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete record?")) {
      await deleteRecord(id);
      toast.warn("Deleted");
      loadMyRecords();
    }
  };

  const handleForwardToDispatch = (rec) => {
    setLoadingForm({
      transportCode: rec.transportCode,
      transporterName: rec.transporterName,
      jobCode: rec.jobCode,
      vehicleType: rec.vehicleType,
      date: rec.arrivalDate,
      endDate: rec.endDate || "",
      vehicleCount: rec.vehicleCount,
      vehicleNo: rec.vehicleNo,
      mobileNo: rec.mobileNo,
    });
    setForwardingId(rec._id || rec.id);
    setActiveTab("loading");
    toast.info("Auto-filled! Save to Dispatch.");
  };

  // MASTER DATA LOGIC
  const handleMasterImportClick = () => {
    masterInputRef.current.click();
  };
  const handleMasterFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsLoadingMaster(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws);
        const loadedMaster = data.map((row) => ({
          code: row["T-Code"] || row["Code"] || row["transportCode"] || "",
          name: row["T-Name"] || row["Name"] || row["Transporter"] || "",
          vehicle: row["Vehicle No"] || row["Vehicle"] || "",
          mobile: row["Mobile No"] || row["Mobile"] || "",
          job: row["Reg.Type"] || row["Job"] || "MHA",
          type: row["Vehicles Type"] || row["Type"] || "Tractor",
        }));
        await addMasterDataBulk(loadedMaster);
        toast.success(`Saved ${loadedMaster.length} Master Records!`);
        loadMasterData();
      } catch (error) {
        toast.error("Failed to load Master File");
      } finally {
        setIsLoadingMaster(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const clearMasterData = async () => {
    if (window.confirm("Delete ALL Master Data?")) {
      await clearMasterDataDB();
      loadMasterData();
      toast.info("Master Data Cleared");
    }
  };

  const checkCodeConflict = (code) => {
    if (!code) return null;
    const conflict = allSystemRecords.find(
      (r) =>
        r.transportCode == code &&
        (r.recordType === "GATE_ENTRY" || r.recordType === "LOADING")
    );
    return conflict ? conflict.centerName : null;
  };

  const getFilteredMasterRecords = () => {
    if (!masterSearchTerm) return masterRecords;
    const lower = masterSearchTerm.toLowerCase();
    return masterRecords.filter(
      (rec) =>
        (rec.mobile && String(rec.mobile).includes(lower)) ||
        (rec.code && String(rec.code).toLowerCase().includes(lower))
    );
  };

  const handleMasterToArrival = (rec) => {
    const conflictCircle = checkCodeConflict(rec.code);
    if (conflictCircle) {
      toast.error(`Blocked! Code already used in ${conflictCircle}`);
      return;
    }
    setEntryForm({
      transportCode: rec.code,
      transporterName: rec.name,
      vehicleNo: rec.vehicle,
      mobileNo: rec.mobile,
      jobCode: rec.job || "MHA",
      vehicleType: rec.type || "Tractor",
      arrivalDate: new Date().toISOString().split("T")[0],
      endDate: "",
      vehicleCount: "1",
    });
    setActiveTab("entry");
    toast.info("Data Autofilled! Please Check & Save.");
  };

  // EXPORT UTILS
  const exportToExcel = () => {
    const dataToExport = filteredRecords.map((rec) => ({
      Date: rec.arrivalDate || rec.date,
      Code: rec.transportCode,
      Circle: rec.centerName,
      "Job Type": rec.jobCode,
      "Vehicle Type": rec.vehicleType,
      Transporter: rec.transporterName,
      Mobile: rec.mobileNo,
      "Vehicle No": rec.vehicleNo,
      Count: rec.vehicleCount,
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Records");
    XLSX.writeFile(wb, `${user.name}_Report.xlsx`);
    toast.success("Excel Downloaded!");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text(`MELLBRO SUGARS - ${user.name}`, 14, 15);
    autoTable(doc, {
      head: [
        [
          "Date",
          "Code",
          "Job",
          "Type",
          "Transporter",
          "Mobile",
          "Vehicle",
          "Count",
        ],
      ],
      body: filteredRecords.map((r) => [
        r.arrivalDate || r.date,
        r.transportCode,
        r.jobCode,
        r.vehicleType,
        r.transporterName,
        r.mobileNo,
        r.vehicleNo,
        r.vehicleCount,
      ]),
      startY: 25,
    });
    doc.save(`${user.name}_Report.pdf`);
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        let count = 0;
        for (const row of data) {
          const newRecord = {
            centerId: user.userId,
            centerName: user.name,
            recordType: activeTab === "entry" ? "GATE_ENTRY" : "LOADING",
            arrivalDate: row["Date"] || "",
            endDate: "",
            transportCode: row["Code"] || "",
            jobCode: row["Job Type"] || "MHA",
            vehicleType: row["Vehicle Type"] || "Tractor",
            transporterName: row["Transporter"] || "",
            vehicleNo: row["Vehicle No"] || "",
            mobileNo: row["Mobile"] || "",
            vehicleCount: row["Count"] || "1",
          };
          if (newRecord.vehicleNo) {
            await addRecord(newRecord);
            count++;
          }
        }
        loadMyRecords();
        toast.success(`Imported ${count} Records!`);
      } catch (e) {
        toast.error("Error Importing");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const getGraphData = () => {
    const dataMap = {};
    myRecords.forEach((rec) => {
      const d = rec.arrivalDate || rec.date;
      if (!dataMap[d]) dataMap[d] = 0;
      dataMap[d] += Number(rec.vehicleCount || 0);
    });
    return Object.keys(dataMap)
      .sort()
      .slice(-7)
      .map((d) => ({ date: d, count: dataMap[d] }));
  };

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
        <h2>⏳ Loading User Profile...</h2>
      </div>
    );
  }

  const indexOfLastRecord = currentPage * recordsPerPage;
  const currentRecords = filteredRecords.slice(
    indexOfLastRecord - recordsPerPage,
    indexOfLastRecord
  );
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} onNavigate={onNavigate} />
      <div className="container">
        {/* ✅ NEW STATS CARDS LAYOUT */}
        <div
          className="summary-grid"
          style={{
            marginBottom: "25px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
          }}
        >
          <div className="summary-card">
            <h4>🚜 Total Arrival</h4>
            <h2 style={{ color: "#27ae60" }}>{stats.arrival}</h2>
          </div>
          <div className="summary-card">
            <h4>🚚 Load Vehicle</h4>
            <h2 style={{ color: "#f39c12" }}>{stats.dispatch}</h2>
          </div>
          <div className="summary-card">
            <h4>✅ Unload Vehicle</h4>
            <h2 style={{ color: "#27ae60" }}>{stats.unloaded}</h2>
          </div>
          <div className="summary-card">
            <h4>⏳ Pending of Unloading</h4>
            <h2 style={{ color: "#e74c3c" }}>{stats.pendingUnload}</h2>
          </div>
          <div className="summary-card">
            <h4>⛔ Non Working</h4>
            <h2 style={{ color: "#8e44ad" }}>{stats.nonWorking}</h2>
          </div>
        </div>

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
            onClick={() => setActiveTab("entry")}
            className="btn-submit"
            style={{
              background: activeTab === "entry" ? "#2ecc71" : "#e0e5ec",
              color: activeTab === "entry" ? "white" : "#555",
            }}
          >
            🚜 Gate Arrival
          </button>
          <button
            onClick={() => setActiveTab("loading")}
            className="btn-submit"
            style={{
              background: activeTab === "loading" ? "#e67e22" : "#e0e5ec",
              color: activeTab === "loading" ? "white" : "#555",
            }}
          >
            🏭 Dispatch
          </button>
          <button
            onClick={() => setActiveTab("master")}
            className="btn-submit"
            style={{
              background: activeTab === "master" ? "#8e44ad" : "#e0e5ec",
              color: activeTab === "master" ? "white" : "#555",
            }}
          >
            📂 Master Data
          </button>
        </div>

        {/* 1. MASTER DATA VIEW */}
        {activeTab === "master" && (
          <div className="form-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "15px",
                gap: "10px",
              }}
            >
              <h3 style={{ margin: 0 }}>📂 Master Data (MongoDB)</h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="🔍 Search Code / Mobile..."
                  className="form-control"
                  style={{ width: "220px" }}
                  value={masterSearchTerm}
                  onChange={(e) => setMasterSearchTerm(e.target.value)}
                />
                <input
                  type="file"
                  ref={masterInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx, .xls"
                  onChange={handleMasterFileChange}
                />
                <button
                  onClick={handleMasterImportClick}
                  className="btn-excel"
                  style={{
                    background: "#8e44ad",
                    color: "white",
                    border: "none",
                  }}
                >
                  {isLoadingMaster ? "Saving..." : "📥 Load Excel"}
                </button>
                {masterRecords.length > 0 && (
                  <button
                    onClick={clearMasterData}
                    className="btn-delete"
                    style={{ padding: "5px 10px" }}
                  >
                    🗑️ Clear DB
                  </button>
                )}
              </div>
            </div>
            <div
              className="table-container"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              <table>
                <thead>
                  <tr style={{ background: "#f4ecf7" }}>
                    <th>Code</th>
                    <th>Transporter</th>
                    <th>Vehicle</th>
                    <th>Job</th>
                    <th>Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredMasterRecords().length > 0 ? (
                    getFilteredMasterRecords().map((rec, i) => {
                      const conflictCircle = checkCodeConflict(rec.code);
                      const hasConflict = !!conflictCircle;

                      return (
                        <tr
                          key={i}
                          style={{
                            backgroundColor: hasConflict
                              ? "#f2f2f2"
                              : "inherit",
                            opacity: hasConflict ? 0.7 : 1,
                          }}
                        >
                          <td
                            style={{
                              color: hasConflict ? "#7f8c8d" : "inherit",
                              fontWeight: "bold",
                            }}
                          >
                            {rec.code}
                          </td>
                          <td>
                            {rec.name} <br />
                            <small>{rec.mobile}</small>
                          </td>
                          <td>{rec.vehicle}</td>
                          <td>{rec.job}</td>
                          <td>{rec.type}</td>
                          <td>
                            <button
                              disabled={hasConflict}
                              onClick={() =>
                                !hasConflict && handleMasterToArrival(rec)
                              }
                              className="btn-save"
                              style={{
                                padding: "5px 10px",
                                fontSize: "0.8rem",
                                background: hasConflict ? "#95a5a6" : "#3498db",
                                cursor: hasConflict ? "not-allowed" : "pointer",
                                border: hasConflict
                                  ? "1px solid #7f8c8d"
                                  : "none",
                              }}
                            >
                              {hasConflict
                                ? `🔒 Used (${conflictCircle})`
                                : "Send to Arrival 🚜"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center" }}>
                        No matching records found in Database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. FORM VIEW */}
        {activeTab !== "master" && (
          <div className="form-card">
            <form
              onSubmit={
                activeTab === "entry" ? handleEntrySubmit : handleLoadingSubmit
              }
            >
              <h3
                style={{
                  color: activeTab === "entry" ? "#27ae60" : "#e67e22",
                  textAlign: "center",
                }}
              >
                {activeTab === "entry"
                  ? "🚜 Sugarcane Arrival Entry"
                  : "🏭 Sugarcane Dispatch Entry"}
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Transporter Code</label>
                  <input
                    required
                    name="transportCode"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.transportCode
                        : loadingForm.transportCode
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  />
                </div>
                <div className="form-group">
                  <label>Transporter Name</label>
                  <input
                    required
                    name="transporterName"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.transporterName
                        : loadingForm.transporterName
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Job Code</label>
                  <select
                    name="jobCode"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.jobCode
                        : loadingForm.jobCode
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  >
                    {jobCodes.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Vehicle Type</label>
                  <select
                    name="vehicleType"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.vehicleType
                        : loadingForm.vehicleType
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  >
                    {vehicleTypes.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    {activeTab === "entry" ? "Arrival Date" : "Dispatch Date"}
                  </label>
                  <input
                    required
                    name={activeTab === "entry" ? "arrivalDate" : "date"}
                    type="date"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.arrivalDate
                        : loadingForm.date
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date (Optional)</label>
                  <input
                    name="endDate"
                    type="date"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.endDate
                        : loadingForm.endDate
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Mobile No</label>
                  <input
                    required
                    name="mobileNo"
                    type="number"
                    className="form-control"
                    value={
                      activeTab === "entry"
                        ? entryForm.mobileNo
                        : loadingForm.mobileNo
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  />
                </div>
                <div className="form-group">
                  <label>Total Vehicles</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="50"
                    className="form-control"
                    name="vehicleCount"
                    value={
                      activeTab === "entry"
                        ? entryForm.vehicleCount
                        : loadingForm.vehicleCount
                    }
                    onChange={(e) => handleChange(e, activeTab)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Vehicle No(s)</label>
                <input
                  required
                  name="vehicleNo"
                  className="form-control"
                  value={
                    activeTab === "entry"
                      ? entryForm.vehicleNo
                      : loadingForm.vehicleNo
                  }
                  onChange={(e) => handleChange(e, activeTab)}
                />
              </div>
              <button
                className="btn-submit"
                style={{
                  width: "100%",
                  background: activeTab === "entry" ? "#2ecc71" : "#e67e22",
                }}
              >
                {activeTab === "entry"
                  ? "Save Gate Arrival"
                  : "Save Dispatch/Loading"}
              </button>
            </form>
          </div>
        )}

        {/* 3. REGISTRY TABLE */}
        {activeTab !== "master" && (
          <div className="form-card" style={{ marginTop: "30px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3>
                📋{" "}
                {activeTab === "entry"
                  ? "Arrival Registry"
                  : "Dispatch Registry"}
              </h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="🔍 Search..."
                  className="form-control"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="btn-excel"
                  style={{
                    background: "#8e44ad",
                    color: "white",
                    border: "none",
                  }}
                >
                  📥 Import
                </button>
                <button
                  onClick={exportToPDF}
                  className="btn-excel"
                  style={{
                    background: "#c0392b",
                    color: "white",
                    border: "none",
                  }}
                >
                  📄 PDF
                </button>
                <button
                  onClick={exportToExcel}
                  className="btn-excel"
                  style={{
                    background: "#27ae60",
                    color: "white",
                    border: "none",
                  }}
                >
                  📊 Excel
                </button>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Code</th>
                    <th>Circle</th>
                    <th>Job</th>
                    <th>Transporter</th>
                    <th>Vehicle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((rec, index) => (
                    <tr key={rec._id || rec.id || index}>
                      <td>{rec.arrivalDate || rec.date}</td>
                      <td>{rec.transportCode}</td>
                      <td>{rec.centerName}</td>
                      <td>{rec.jobCode}</td>
                      <td>
                        <b>{rec.transporterName}</b>
                        <br />
                        <small>{rec.mobileNo}</small>
                      </td>
                      <td>
                        {rec.vehicleNo}
                        <br />
                        <small>{rec.vehicleType}</small>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "5px" }}>
                          {activeTab === "entry" && (
                            <button
                              onClick={() => handleForwardToDispatch(rec)}
                              className="btn-save"
                              style={{
                                padding: "5px 10px",
                                fontSize: "0.8rem",
                                background: "#e67e22",
                              }}
                            >
                              ➡️ Dispatch
                            </button>
                          )}
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(rec._id || rec.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "20px",
                  gap: "10px",
                }}
              >
                <button
                  className="btn-cancel"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>
                  {currentPage} / {totalPages}
                </span>
                <button
                  className="btn-save"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. GRAPH */}
        {activeTab !== "master" && (
          <div className="form-card" style={{ marginTop: "30px" }}>
            <h3>📊 Trend (7 Days)</h3>
            <div style={{ width: "99%", height: 300, minWidth: 0 }}>
              <ResponsiveContainer>
                <BarChart data={getGraphData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="count"
                    fill={activeTab === "entry" ? "#2ecc71" : "#e67e22"}
                    name="Vehicles"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterDashboard;
