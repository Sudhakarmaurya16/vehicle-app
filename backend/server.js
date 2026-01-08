const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* ===================== ROOT ROUTE (FIX) ===================== */
// ❌ Cannot GET / error ka fix
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "🚀 Vehicle Backend API is running successfully",
    environment: process.env.NODE_ENV || "development",
  });
});

/* ===================== DATABASE CONNECTION ===================== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
  });

/* ===================== ROUTES ===================== */
const userRoute = require("./routes/users");
const recordRoute = require("./routes/records");
const masterRoute = require("./routes/master");

app.use("/api/users", userRoute);
app.use("/api/records", recordRoute);
app.use("/api/master", masterRoute);

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({
    status: "ERROR",
    message: "Route not found",
  });
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
