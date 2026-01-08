const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- DATABASE CONNECTION FIX ---

// ❌ Maine purana hardcoded PASSWORD aur MONGO_URI hata diya hai.
// ✅ Ab hum process.env.MONGO_URI use karenge taaki Render ki settings kaam karein.

mongoose
  .connect(process.env.MONGO_URI) // <-- Ye sabse important change hai
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully"))
  .catch((err) => console.log("❌ Connection Error:", err));

// --- REST OF THE CODE ---
const userRoute = require("./routes/users");
const recordRoute = require("./routes/records");
const masterRoute = require("./routes/master");

app.use("/api/users", userRoute);
app.use("/api/records", recordRoute);
app.use("/api/master", masterRoute);

// Render par PORT dynamic hota hai, isliye process.env.PORT lagana zaroori hai
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
