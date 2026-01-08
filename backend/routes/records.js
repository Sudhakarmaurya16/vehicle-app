const router = require("express").Router();
const Record = require("../models/Record");

// ✅ 1. GET ALL RECORDS (Ye missing tha)
router.get("/all", async (req, res) => {
  try {
    const records = await Record.find();
    res.status(200).json(records);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. ADD RECORD
router.post("/add", async (req, res) => {
  try {
    const newRecord = new Record(req.body);
    const savedRecord = await newRecord.save();
    res.status(200).json(savedRecord);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 3. UPDATE & DELETE
router.put("/update/:id", async (req, res) => {
  try {
    const updatedRecord = await Record.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.status(200).json(updatedRecord);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    await Record.findByIdAndDelete(req.params.id);
    res.status(200).json("Record deleted");
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
