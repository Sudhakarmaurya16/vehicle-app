// backend/seed.js
const mongoose = require("mongoose");
const User = require("./models/User");

// Database se connect karein
mongoose
  .connect("mongodb://127.0.0.1:27017/sugar_factory_db")
  .then(() => console.log("✅ Connected to DB"))
  .catch((err) => console.log(err));

const createAdmin = async () => {
  try {
    // Check karein agar admin pehle se hai
    const existingAdmin = await User.findOne({ userId: "admin" });
    if (existingAdmin) {
      console.log("⚠️ Admin pehle se maujood hai!");
      process.exit();
    }

    // Naya Admin banayein
    const newAdmin = new User({
      userId: "admin",
      name: "Super Admin",
      password: "admin",
      role: "admin",
    });

    await newAdmin.save();
    console.log("🎉 Super Admin Created Successfully!");
    console.log("👉 ID: admin");
    console.log("👉 Pass: admin");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(); // Script band karein
  }
};

createAdmin();
