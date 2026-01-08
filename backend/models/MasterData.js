const mongoose = require("mongoose");

const MasterSchema = new mongoose.Schema({
  code: String,
  name: String,
  vehicle: String,
  mobile: String,
  job: String,
  type: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MasterData", MasterSchema);