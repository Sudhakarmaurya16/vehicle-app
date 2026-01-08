const mongoose = require("mongoose");

const RecordSchema = new mongoose.Schema({
  centerId: { type: String, required: true },
  centerName: { type: String, required: true },
  recordType: { type: String, required: true },
  transportCode: { type: String, default: "" },
  transporterName: { type: String, default: "" },
  jobCode: { type: String, default: "MHA" },
  vehicleType: { type: String, default: "Tractor" },
  arrivalDate: { type: String, default: "" },
  endDate: { type: String, default: "" },
  vehicleNo: { type: String, required: true },
  mobileNo: { type: String, default: "" },
  vehicleCount: { type: String, default: "1" },

  // ✅ YE FIELD MISSING THA, ISLIYE REFRESH PER DATA HAT RAHA THA
  manualUnload: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Record", RecordSchema);
