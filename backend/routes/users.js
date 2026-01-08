const router = require("express").Router();
const User = require("../models/User");

// ✅ 1. GET ALL USERS (Ye missing tha)
router.get("/all", async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json(err);
  }
});

// 2. LOGIN
router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.body.userId });
    if (!user) return res.status(404).json("User not found");
    if (user.password !== req.body.password) return res.status(400).json("Wrong password");
    const { password, ...others } = user._doc;
    res.status(200).json(others);
  } catch (err) { res.status(500).json(err); }
});

// 3. ADD USER
router.post("/add", async (req, res) => {
  try {
    const newUser = new User(req.body);
    const savedUser = await newUser.save();
    res.status(200).json(savedUser);
  } catch (err) { res.status(500).json(err); }
});

// 4. UPDATE & DELETE
router.put("/update/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.status(200).json(updatedUser);
  } catch (err) { res.status(500).json(err); }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json("User deleted");
  } catch (err) { res.status(500).json(err); }
});

module.exports = router;