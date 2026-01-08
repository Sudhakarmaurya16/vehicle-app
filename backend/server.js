const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- DATABASE CONNECTION FIX ---

// ✅ Password ko quotes " " ke andar likhna zaroori hai
const PASSWORD = encodeURIComponent("mellbro@123"); 

const MONGO_URI = `mongodb+srv://mellbro:${PASSWORD}@cluster0.hnu7srq.mongodb.net/sugar_factory_db?appName=Cluster0`;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas Connected Successfully"))
  .catch((err) => console.log("❌ Connection Error:", err));

// --- REST OF THE CODE ---
const userRoute = require("./routes/users");
const recordRoute = require("./routes/records");
const masterRoute = require("./routes/master");

app.use("/api/users", userRoute);
app.use("/api/records", recordRoute);
app.use("/api/master", masterRoute);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});