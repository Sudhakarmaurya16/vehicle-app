const router = require("express").Router();
const MasterData = require("../models/MasterData");

// 1. ADD BULK DATA (Excel Upload)
router.post("/bulk-add", async (req, res) => {
  try {
    // Naya data add karein (Purana rakhna hai ya delete karna hai ye aap par hai)
    // Yahan hum append kar rahe hain:
    const savedData = await MasterData.insertMany(req.body);
    res.status(200).json(savedData);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. GET ALL MASTER DATA
router.get("/all", async (req, res) => {
  try {
    const data = await MasterData.find();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 3. DELETE ALL (Clear Data)
router.delete("/clear", async (req, res) => {
  try {
    await MasterData.deleteMany({});
    res.status(200).json("Master Data Cleared");
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
