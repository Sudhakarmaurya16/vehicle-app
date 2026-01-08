import React, { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "./Navbar";
import {
  getRecords,
  updateRecord,
  deleteRecord,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  addRecord,
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

const AdminDashboard = ({ onLogout }) => {
  const [allRecords, setAllRecords] = useState([]);
  const [users, setUsers] = useState([]);

  // --- FILTERS STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCircle, setSelectedCircle] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Other States
  const [newCenter, setNewCenter] = useState({
    id: "",
    name: "",
    password: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: "", password: "" });
  const [manualUnloads, setManualUnloads] = useState({});

  const fileInputRef = useRef(null);
  const bulkUnloadRef = useRef(null);

  useEffect(() => {
    refreshData();
  }, []);

  // --- HELPER: ROBUST MATCHING ---
  const isMatch = (rec1, rec2) => {
    if (rec1.transportCode && rec2.transportCode) {
      return rec1.transportCode == rec2.transportCode;
    }
    const v1 = (rec1.vehicleNo || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const v2 = (rec2.vehicleNo || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");
    const d1 = (rec1.arrivalDate || "").toString().trim();
    const d2 = (rec2.arrivalDate || "").toString().trim();
    return v1 === v2 && d1 === d2;
  };

  // --- MAIN FILTER LOGIC ---
  const { arrivalRecords, loadingRecords } = useMemo(() => {
    let result = allRecords;

    // 1. Date Range Filter
    if (dateRange.start && dateRange.end) {
      result = result.filter((r) => {
        const d = r.arrivalDate || r.date;
        return d >= dateRange.start && d <= dateRange.end;
      });
    }

    // 2. CIRCLE FILTER
    if (selectedCircle) {
      result = result.filter((r) => r.centerName === selectedCircle);
    }

    // 3. Search Filter (Smart Search including "Pending" status check)
    const rawLoadingRecords = allRecords.filter(
      (r) => r.recordType === "LOADING"
    );

    if (searchTerm) {
      const searchKeywords = searchTerm.toLowerCase().trim().split(/\s+/);
      result = result.filter((r) => {
        let status = "pending";

        if (r.recordType === "LOADING") {
          status = Number(r.manualUnload || 0) > 0 ? "done" : "pending";
        } else {
          // For Arrival records, check if they have a matching dispatch with unload
          const partner = rawLoadingRecords.find((l) => isMatch(l, r));
          const unloadVal = partner ? Number(partner.manualUnload || 0) : 0;
          status = unloadVal > 0 ? "done" : "pending";
        }

        const combinedText = `
          ${r.arrivalDate || ""}
          ${r.transportCode || ""}
          ${r.centerName || ""}
          ${r.mobileNo || ""}
          ${r.transporterName || ""}
          ${r.vehicleNo || ""}
          ${status} 
        `.toLowerCase();

        return searchKeywords.every((keyword) =>
          combinedText.includes(keyword)
        );
      });
    }

    return {
      arrivalRecords: result.filter((r) => r.recordType === "GATE_ENTRY"),
      loadingRecords: result.filter((r) => r.recordType === "LOADING"),
    };
  }, [allRecords, dateRange, searchTerm, selectedCircle]);

  // ... Rest of the logic ...
  const todaysDispatchRecords = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return allRecords.filter(
      (r) => r.recordType === "LOADING" && r.arrivalDate === today
    );
  }, [allRecords]);

  const circleStats = useMemo(() => {
    return users.map((u) => {
      const userId = u.userId || u.id;
      const myArrivals = arrivalRecords.filter((r) => r.centerId === userId);
      const myLoading = loadingRecords.filter((r) => r.centerId === userId);
      const totalArrival = myArrivals.reduce(
        (acc, r) => acc + Number(r.vehicleCount || 0),
        0
      );
      const totalLoad = myLoading.reduce(
        (acc, r) => acc + Number(r.vehicleCount || 0),
        0
      );
      const totalUnload = myLoading.reduce(
        (acc, r) => acc + (Number(r.manualUnload) || 0),
        0
      );
      return {
        id: userId,
        name: u.name,
        arrival: totalArrival,
        load: totalLoad,
        unload: totalUnload,
        balanceCenter: Math.max(0, totalArrival - totalLoad),
        balanceFactory: Math.max(0, totalLoad - totalUnload),
      };
    });
  }, [users, arrivalRecords, loadingRecords]);

  const refreshData = async () => {
    try {
      const [recs, usrs] = await Promise.all([getRecords(), getUsers()]);
      const safeRecs = recs || [];
      const safeUsers = usrs || [];
      safeRecs.reverse();
      setAllRecords(safeRecs);
      setUsers(safeUsers.filter((u) => u.role === "center"));
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleUnloadChange = (id, value) => {
    setManualUnloads((prev) => ({ ...prev, [id]: value }));
  };

  const saveManualUnload = async (rec) => {
    const recordId = rec._id || rec.id;
    const newValue = manualUnloads[recordId];
    if (newValue === undefined) return;
    const loadQty = Number(rec.vehicleCount || 0);
    const unloadQty = Number(newValue);

    if (unloadQty > loadQty) {
      toast.error(`Error: Unload > Load!`);
      return;
    }
    if (unloadQty < 0) {
      toast.error("Negative value not allowed");
      return;
    }

    try {
      const updatedRecord = { ...rec, _id: recordId, manualUnload: unloadQty };
      await updateRecord(updatedRecord);
      setAllRecords((prevRecords) =>
        prevRecords.map((item) =>
          item._id === recordId || item.id === recordId ? updatedRecord : item
        )
      );
      const newManualState = { ...manualUnloads };
      delete newManualState[recordId];
      setManualUnloads(newManualState);
      toast.success("Saved! ✅");
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const handleBulkUnloadClick = () => bulkUnloadRef.current.click();
  const handleBulkUnloadFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          toast.warn("Empty Excel");
          return;
        }

        const dispatchRecords = allRecords.filter(
          (r) => r.recordType === "LOADING"
        );
        let updatedCount = 0;
        const updatePromises = [];

        const getValue = (row, keywords) => {
          const keys = Object.keys(row);
          return row[
            keys.find((k) =>
              keywords.some((kw) => k.toLowerCase().includes(kw.toLowerCase()))
            )
          ];
        };
        const cleanStr = (val) =>
          !val
            ? ""
            : String(val)
                .replace(/[^a-zA-Z0-9]/g, "")
                .toUpperCase();

        for (const row of data) {
          const rawVehicle = getValue(row, ["vehicle", "veh", "no"]);
          const rawCode = getValue(row, ["code", "id"]);
          const rawUnload = getValue(row, ["unload", "qty"]);

          const excelCode = cleanStr(rawCode);
          const excelVehicle = cleanStr(rawVehicle);
          if (!excelCode && !excelVehicle) continue;

          const match = dispatchRecords.find((r) => {
            const dbCode = cleanStr(r.transportCode);
            const dbVehicle = cleanStr(r.vehicleNo);
            return (
              (excelCode && dbCode === excelCode) ||
              (excelVehicle && dbVehicle.includes(excelVehicle))
            );
          });

          if (match) {
            const maxLoad = Number(match.vehicleCount || 0);
            let finalUnload = rawUnload ? Number(rawUnload) : maxLoad;
            if (finalUnload > maxLoad) finalUnload = maxLoad;

            if (finalUnload > 0) {
              updatePromises.push(
                updateRecord({
                  ...match,
                  _id: match._id || match.id,
                  manualUnload: finalUnload,
                })
              );
              updatedCount++;
            }
          }
        }
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          await refreshData();
          toast.success(`Updated ${updatedCount} records`);
        } else {
          toast.error("No matches found");
        }
      } catch (err) {
        toast.error("Excel Error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const viewTotalLoad = arrivalRecords.reduce(
    (acc, r) => acc + Number(r.vehicleCount || 0),
    0
  );
  const viewTotalUnload = loadingRecords.reduce(
    (acc, r) => acc + (Number(r.manualUnload) || 0),
    0
  );
  const liveNetBalance = useMemo(() => {
    const totalIn = allRecords
      .filter((r) => r.recordType === "GATE_ENTRY")
      .reduce((sum, r) => sum + Number(r.vehicleCount || 0), 0);
    const totalOut = allRecords
      .filter((r) => r.recordType === "LOADING")
      .reduce((sum, r) => sum + Number(r.manualUnload || 0), 0);
    return Math.max(0, totalIn - totalOut);
  }, [allRecords]);

  const chartData = users.map((u) => {
    const matchId = u.userId || u.id;
    const load = arrivalRecords
      .filter((r) => r.centerId === matchId)
      .reduce((sum, r) => sum + Number(r.vehicleCount || 0), 0);
    const unload = loadingRecords
      .filter((r) => r.centerId === matchId)
      .reduce((sum, r) => sum + (Number(r.manualUnload) || 0), 0);
    return { name: u.name, Load: load, Unload: unload };
  });

  // --- EXPORT TO EXCEL ---
  const exportToExcel = () => {
    const formatData = (records) =>
      records.map((rec) => {
        const matchingDispatch = loadingRecords.find((lr) => isMatch(lr, rec));
        const load = Number(rec.vehicleCount || 0);
        const unload =
          rec.recordType === "LOADING"
            ? Number(rec.manualUnload) || 0
            : matchingDispatch
            ? Number(matchingDispatch.manualUnload) || 0
            : 0;
        return {
          Date: rec.arrivalDate,
          Code: rec.transportCode || "-",
          Circle: rec.centerName,
          Vehicle: rec.vehicleNo,
          Load: load,
          Unload: unload,
          Total: load - unload,
          Status: unload > 0 ? "Done" : "Pending",
        };
      });

    const ws1 = XLSX.utils.json_to_sheet(formatData(arrivalRecords));
    const ws2 = XLSX.utils.json_to_sheet(formatData(loadingRecords));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Arrival");
    XLSX.utils.book_append_sheet(wb, ws2, "Dispatch");
    XLSX.writeFile(
      wb,
      selectedCircle ? `${selectedCircle}_Report.xlsx` : "Report.xlsx"
    );
  };

  // --- FIXED PDF EXPORT FUNCTION ---
  const exportToPDF = () => {
    if (arrivalRecords.length === 0 && loadingRecords.length === 0) {
      toast.error("No records found to export!");
      return;
    }

    try {
      const doc = new jsPDF();

      // HEADER
      doc.setFillColor(39, 174, 96);
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("MELLBRO SUGARS PVT. LTD.", 14, 13);

      doc.setFontSize(10);
      const subTitle = selectedCircle
        ? `Circle Report: ${selectedCircle}`
        : "All Centers Report";
      doc.text(subTitle, 150, 13);

      // RESET TEXT COLOR TO BLACK (CRITICAL FIX)
      doc.setTextColor(0, 0, 0);

      let finalY = 30;

      // TABLE 1: DISPATCH
      if (loadingRecords.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(230, 126, 34);
        doc.text(
          `Dispatch / Loading Data (${loadingRecords.length})`,
          14,
          finalY
        );
        finalY += 2;

        const loadingRows = loadingRecords.map((rec) => {
          const savedUnload = manualUnloads[rec._id || rec.id];
          const currentUnload =
            savedUnload !== undefined
              ? Number(savedUnload)
              : Number(rec.manualUnload || 0);
          const load = Number(rec.vehicleCount || 0);
          return [
            rec.arrivalDate,
            rec.transportCode,
            rec.centerName,
            rec.vehicleNo,
            load,
            currentUnload,
            load - currentUnload,
          ];
        });

        autoTable(doc, {
          head: [
            ["Date", "Code", "Circle", "Vehicle", "Load", "Unload", "Bal"],
          ],
          body: loadingRows,
          startY: finalY + 3,
          theme: "grid",
          styles: { fontSize: 8, textColor: 0 },
          headStyles: { fillColor: [230, 126, 34], textColor: 255 },
        });

        finalY = doc.lastAutoTable.finalY + 15;
      }

      // TABLE 2: ARRIVAL (Including Pending)
      if (arrivalRecords.length > 0) {
        doc.setFontSize(12);
        doc.setTextColor(39, 174, 96);
        doc.text(
          `Arrival / Gate Entry Data (${arrivalRecords.length})`,
          14,
          finalY
        );
        finalY += 2;

        const arrivalRows = arrivalRecords.map((rec) => {
          const match = loadingRecords.find((lr) => isMatch(lr, rec));
          const unload = match ? Number(match.manualUnload) || 0 : 0;
          const status = unload > 0 ? "Done" : "Pending";
          return [
            rec.arrivalDate,
            rec.transportCode,
            rec.centerName,
            rec.vehicleNo,
            rec.vehicleCount,
            status,
          ];
        });

        autoTable(doc, {
          head: [["Date", "Code", "Circle", "Vehicle", "Load", "Status"]],
          body: arrivalRows,
          startY: finalY + 3,
          theme: "grid",
          styles: { fontSize: 8, textColor: 0 },
          headStyles: { fillColor: [39, 174, 96], textColor: 255 },
        });
      }

      const fileName = selectedCircle
        ? `${selectedCircle}_Report.pdf`
        : "Factory_Report.pdf";
      doc.save(fileName);
      toast.success("PDF Generated Successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Error generating PDF");
    }
  };

  const handleImportClick = () => fileInputRef.current.click();
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const processSheet = async (sheetName, recordType) => {
          const ws = wb.Sheets[sheetName];
          if (!ws) return;
          const data = XLSX.utils.sheet_to_json(ws);
          for (const row of data) {
            const circleName = row["Circle"] || row["centerName"];
            const matchedUser = users.find((u) => u.name === circleName);
            const centerId = matchedUser ? matchedUser.userId : "ADMIN_IMPORT";
            const newRecord = {
              recordType,
              arrivalDate: row["Date"] || "",
              transportCode: row["Code"] || "",
              centerId,
              centerName: circleName || "Imported",
              jobCode: row["Job Type"] || "MHA",
              transporterName: row["Transporter Name"] || "",
              mobileNo: row["Mobile No"] || "",
              vehicleNo: row["Vehicle No"] || "",
              vehicleCount: row["Load Qty"] || "1",
              manualUnload: row["Unload Qty"] || 0,
            };
            if (newRecord.vehicleNo) await addRecord(newRecord);
          }
        };
        if (wb.SheetNames.includes("Arrival_Logs")) {
          await processSheet("Arrival_Logs", "GATE_ENTRY");
          await processSheet("Dispatch_Data", "LOADING");
        } else {
          await processSheet(wb.SheetNames[0], "GATE_ENTRY");
        }
        refreshData();
        toast.success("Import Successful!");
      } catch (error) {
        toast.error("Import Failed");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = null;
  };

  const handleCreateCenter = async (e) => {
    e.preventDefault();
    if (users.some((u) => u.userId === newCenter.id)) {
      toast.error("ID Exists");
      return;
    }
    await addUser({
      userId: newCenter.id,
      name: newCenter.name,
      password: newCenter.password,
      role: "center",
    });
    refreshData();
    setNewCenter({ id: "", name: "", password: "" });
    toast.success("Created");
  };
  const startEditing = (u) => {
    setEditingId(u._id || u.id);
    setEditFormData({ name: u.name, password: u.password });
  };
  const saveEdit = async (id) => {
    const u = users.find((x) => (x._id || x.id) === id);
    if (u) await updateUser({ ...u, ...editFormData, _id: id });
    setEditingId(null);
    refreshData();
  };
  const handleDelete = async (id) => {
    if (window.confirm("Delete?")) {
      await deleteUser(id);
      refreshData();
    }
  };
  const handleBulkDelete = async () => {
    if (window.confirm("DELETE ALL?")) {
      await Promise.all(
        [...arrivalRecords, ...loadingRecords].map((r) =>
          deleteRecord(r._id || r.id)
        )
      );
      refreshData();
    }
  };

  return (
    <div>
      <Navbar
        user={{ role: "admin", name: "Super Admin" }}
        onLogout={onLogout}
      />
      <div className="container">
        {/* SUMMARY CARDS */}
        <div className="summary-grid">
          <div className="summary-card">
            <h4>🚜 Total Arrival</h4>
            <h2 style={{ color: "#27ae60" }}>{viewTotalLoad}</h2>
          </div>
          <div className="summary-card">
            <h4>🏭 Total Manual Unload</h4>
            <h2 style={{ color: "#c0392b" }}>{viewTotalUnload}</h2>
          </div>
          <div className="summary-card">
            <h4>⚖️ Live Net Balance</h4>
            <h2 style={{ color: "#2980b9" }}>{liveNetBalance}</h2>
          </div>
        </div>

        {/* CIRCLE STATS TABLE */}
        <div className="form-card" style={{ marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>🏢 Circle-wise Statistics</h3>
          <div
            className="table-container"
            style={{ maxHeight: "300px", overflowY: "auto" }}
          >
            <table>
              <thead>
                <tr style={{ background: "#2c3e50", color: "white" }}>
                  <th>#</th>
                  <th>Circle Name</th>
                  <th>Arrival</th>
                  <th>Load</th>
                  <th>Unload</th>
                  <th>Factory Pending</th>
                  <th>Center Balance</th>
                </tr>
              </thead>
              <tbody>
                {circleStats.map((stat, idx) => (
                  <tr key={stat.id}>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: "bold" }}>{stat.name}</td>
                    <td
                      style={{
                        color: "#27ae60",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      {stat.arrival}
                    </td>
                    <td
                      style={{
                        color: "#e67e22",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      {stat.load}
                    </td>
                    <td
                      style={{
                        color: "#c0392b",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      {stat.unload}
                    </td>
                    <td
                      style={{
                        fontWeight: "bold",
                        background: "#fcf3cf",
                        textAlign: "center",
                      }}
                    >
                      {stat.balanceFactory}
                    </td>
                    <td
                      style={{
                        fontWeight: "bold",
                        background: "#d4efdf",
                        textAlign: "center",
                      }}
                    >
                      {stat.balanceCenter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="dashboard-grid">
          <div className="form-card">
            <h3>🏢 Register Center</h3>
            <form onSubmit={handleCreateCenter}>
              <div className="form-group">
                <input
                  className="form-control"
                  value={newCenter.id}
                  onChange={(e) =>
                    setNewCenter({ ...newCenter, id: e.target.value })
                  }
                  placeholder="Login ID"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  className="form-control"
                  value={newCenter.name}
                  onChange={(e) =>
                    setNewCenter({ ...newCenter, name: e.target.value })
                  }
                  placeholder="Center Name"
                  required
                />
              </div>
              <div className="form-group">
                <input
                  className="form-control"
                  value={newCenter.password}
                  onChange={(e) =>
                    setNewCenter({ ...newCenter, password: e.target.value })
                  }
                  placeholder="Password"
                  required
                />
              </div>
              <button className="btn-submit">Create</button>
            </form>
          </div>
          <div className="form-card">
            <h3>📊 Load vs Unload</h3>
            <div style={{ width: "99%", height: 250 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Load" fill="#27ae60" />
                  <Bar dataKey="Unload" fill="#c0392b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="form-card">
          <h3>🔐 Manage Centers</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Password</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id || u.id}>
                    <td>{u.userId || u.id}</td>
                    {editingId === (u._id || u.id) ? (
                      <>
                        <td>
                          <input
                            className="table-input"
                            value={editFormData.name}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                name: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="table-input"
                            value={editFormData.password}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                password: e.target.value,
                              })
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn-save"
                            onClick={() => saveEdit(u._id || u.id)}
                          >
                            Save
                          </button>{" "}
                          <button
                            className="btn-cancel"
                            onClick={() => setEditingId(null)}
                          >
                            X
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{u.name}</td>
                        <td>{u.password}</td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => startEditing(u)}
                          >
                            Edit
                          </button>{" "}
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(u._id || u.id)}
                          >
                            Del
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- FILTERS SECTION --- */}
        <div
          className="form-card"
          style={{ background: "#f8f9fa", marginBottom: "20px" }}
        >
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* 1. CIRCLE FILTER */}
            <select
              className="form-control"
              style={{ minWidth: "150px", fontWeight: "bold" }}
              value={selectedCircle}
              onChange={(e) => setSelectedCircle(e.target.value)}
            >
              <option value="">🏠 All Circles</option>
              {users.map((u) => (
                <option key={u.id || u.userId} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* 2. Search */}
            <input
              className="form-control"
              placeholder="Search (Pending, Gadi No...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* 3. Dates */}
            <input
              type="date"
              className="form-control"
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
            />
            <input
              type="date"
              className="form-control"
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
            />

            {/* 4. Buttons */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
            />
            <button
              className="btn-excel"
              onClick={handleImportClick}
              style={{ background: "#8e44ad", color: "white", border: "none" }}
            >
              📤 Import
            </button>
            <button
              className="btn-excel"
              onClick={exportToPDF}
              style={{ background: "#c0392b", color: "white", border: "none" }}
            >
              📄 PDF
            </button>
            <button className="btn-excel" onClick={exportToExcel}>
              📥 Excel
            </button>
            <button
              className="btn-delete"
              onClick={handleBulkDelete}
              style={{ backgroundColor: "#333", color: "white" }}
            >
              🗑️ Delete All
            </button>
          </div>
        </div>

        {/* TODAY'S DISPATCH SECTION */}
        <div
          className="form-card"
          style={{ borderTop: "5px solid #8e44ad", marginBottom: "20px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ color: "#8e44ad" }}>
              🕒 Today's Dispatch (Live){" "}
              <span
                style={{
                  background: "#8e44ad",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontSize: "0.8rem",
                }}
              >
                {todaysDispatchRecords.length}
              </span>
            </h3>
            <div>
              <input
                type="file"
                ref={bulkUnloadRef}
                style={{ display: "none" }}
                onChange={handleBulkUnloadFileChange}
                accept=".xlsx, .xls"
              />
              <button
                onClick={handleBulkUnloadClick}
                style={{
                  background: "#27ae60",
                  color: "white",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                📥 Bulk Unload
              </button>
            </div>
          </div>
          <div
            className="table-container"
            style={{ maxHeight: "300px", marginTop: "10px" }}
          >
            {todaysDispatchRecords.length === 0 ? (
              <p style={{ textAlign: "center" }}>No records</p>
            ) : (
              <table>
                <thead>
                  <tr style={{ background: "#f4ecf7" }}>
                    <th>Time</th>
                    <th>Code</th>
                    <th>Circle</th>
                    <th>Vehicle</th>
                    <th>Load</th>
                    <th>Unload</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {todaysDispatchRecords.map((rec) => {
                    const rid = rec._id || rec.id;
                    const load = Number(rec.vehicleCount || 0);
                    const cur =
                      manualUnloads[rid] !== undefined
                        ? manualUnloads[rid]
                        : rec.manualUnload || 0;
                    const done = Number(rec.manualUnload || 0) > 0;
                    return (
                      <tr key={rid}>
                        <td>{rec.arrivalDate}</td>
                        <td>{rec.transportCode}</td>
                        <td>{rec.centerName}</td>
                        <td>{rec.vehicleNo}</td>
                        <td style={{ color: "green", fontWeight: "bold" }}>
                          {load}
                        </td>
                        <td>
                          <input
                            type="number"
                            className="table-input"
                            disabled={done}
                            style={{
                              width: "60px",
                              background: done ? "#eee" : "#fff",
                            }}
                            value={cur}
                            onChange={(e) =>
                              handleUnloadChange(rid, e.target.value)
                            }
                          />
                        </td>
                        <td>
                          {done ? (
                            <span style={{ color: "green" }}>Done</span>
                          ) : (
                            <span style={{ color: "orange" }}>Pending</span>
                          )}
                        </td>
                        <td>
                          {manualUnloads[rid] !== undefined ? (
                            <button
                              className="btn-save"
                              onClick={() => saveManualUnload(rec)}
                            >
                              Save
                            </button>
                          ) : done ? (
                            "✅"
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* LOADING TABLE */}
        <div className="form-card" style={{ borderTop: "5px solid #e67e22" }}>
          <h3 style={{ color: "#e67e22" }}>
            🏭 Master Dispatch Logs ({loadingRecords.length})
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr style={{ background: "#e8f8f5" }}>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Circle</th>
                  <th>Vehicle</th>
                  <th>Load</th>
                  <th>Unload</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingRecords.map((rec) => (
                  <tr key={rec._id || rec.id}>
                    <td>{rec.arrivalDate}</td>
                    <td>{rec.transportCode}</td>
                    <td>
                      <b>{rec.centerName}</b>
                    </td>
                    <td>{rec.vehicleNo}</td>
                    <td style={{ color: "green", fontWeight: "bold" }}>
                      {rec.vehicleCount}
                    </td>
                    <td>
                      <input
                        type="number"
                        className="table-input"
                        disabled={Number(rec.manualUnload) > 0}
                        style={{
                          width: "70px",
                          background:
                            Number(rec.manualUnload) > 0 ? "#eee" : "#fff",
                        }}
                        value={
                          manualUnloads[rec._id || rec.id] !== undefined
                            ? manualUnloads[rec._id || rec.id]
                            : rec.manualUnload || 0
                        }
                        onChange={(e) =>
                          handleUnloadChange(rec._id || rec.id, e.target.value)
                        }
                      />
                    </td>
                    <td style={{ fontWeight: "bold" }}>
                      {Number(rec.vehicleCount) -
                        (manualUnloads[rec._id || rec.id] !== undefined
                          ? Number(manualUnloads[rec._id || rec.id])
                          : Number(rec.manualUnload || 0))}
                    </td>
                    <td>
                      {manualUnloads[rec._id || rec.id] !== undefined ? (
                        <button
                          className="btn-save"
                          onClick={() => saveManualUnload(rec)}
                        >
                          Save
                        </button>
                      ) : Number(rec.manualUnload) > 0 ? (
                        "✅"
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ARRIVAL TABLE */}
        <div
          className="form-card"
          style={{ marginTop: "30px", borderTop: "5px solid #27ae60" }}
        >
          <h3 style={{ color: "#27ae60" }}>
            🚜 Master Arrival Logs ({arrivalRecords.length})
          </h3>
          <div className="table-container">
            <table>
              <thead>
                <tr style={{ background: "#e8f8f5" }}>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Circle</th>
                  <th>Vehicle</th>
                  <th>Load</th>
                  <th>Unload</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {arrivalRecords.map((rec) => {
                  const match = loadingRecords.find((l) => isMatch(l, rec));
                  const unload = match ? Number(match.manualUnload) || 0 : 0;
                  const load = Number(rec.vehicleCount || 0);
                  const isDone = unload > 0;
                  return (
                    <tr key={rec._id || rec.id}>
                      <td>{rec.arrivalDate}</td>
                      <td>{rec.transportCode}</td>
                      <td>{rec.centerName}</td>
                      <td>{rec.vehicleNo}</td>
                      <td style={{ color: "green", fontWeight: "bold" }}>
                        {load}
                      </td>
                      <td style={{ color: "red", fontWeight: "bold" }}>
                        {unload}
                      </td>
                      <td>{load - unload}</td>
                      <td>
                        {isDone ? (
                          <span
                            style={{
                              color: "green",
                              border: "1px solid green",
                              padding: "2px 8px",
                              borderRadius: "10px",
                            }}
                          >
                            Done
                          </span>
                        ) : (
                          <span
                            style={{
                              color: "orange",
                              border: "1px solid orange",
                              padding: "2px 8px",
                              borderRadius: "10px",
                            }}
                          >
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
