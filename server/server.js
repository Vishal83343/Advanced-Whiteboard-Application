// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();


app.use(cors());

// 2. CRITICAL FIX: 
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/whiteboard")
  .then(() => console.log("✅ MongoDB Compass  connection successful!"))
  .catch((err) => console.error(" MongoDB connection error:", err));

// Board schema
const BoardSchema = new mongoose.Schema({
  image: String, 
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Board = mongoose.model("Board", BoardSchema);

// --- ROUTES ---

// Test Route
app.get("/", (req, res) => {
  res.send("Whiteboard Server is Up and Running!");
});

// Save Route (URL: http://localhost:5000/save)
app.post("/save", async (req, res) => {
  try {
    console.log("📥 Frontend se data aaya hai...");
    const board = new Board({ image: req.body.image });
    await board.save();
    console.log("💾 Database mein save ho gaya!");
    res.json({ message: "Board successfully saved in MongoDB!" });
  } catch (err) {
    console.error(" Save Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all boards route
app.get("/boards", async (req, res) => {
  try {
    const boards = await Board.find().sort({ createdAt: -1 });
    res.json(boards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on: http://localhost:${PORT}`);
});