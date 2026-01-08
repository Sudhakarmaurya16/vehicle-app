const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true }, // Login ID (e.g., 2629)
  name: { type: String, required: true }, // Center Name (e.g., Navanagar)
  password: { type: String, required: true }, // Password
  role: {
    type: String,
    enum: ["admin", "center"],
    default: "center",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", UserSchema);
