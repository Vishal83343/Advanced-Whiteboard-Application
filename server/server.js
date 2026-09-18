const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

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

// Socket.io connection logic
io.on("connection", (socket) => {
  console.log("🟢 User connected to socket:", socket.id);

  socket.on("draw_data", (data) => {
    socket.broadcast.emit("receive_draw_data", data);
  });

  socket.on("clear_board", () => {
    socket.broadcast.emit("receive_clear_board");
  });

  socket.on("load_board", (data) => {
    socket.broadcast.emit("receive_load_board", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start server
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on: http://localhost:${PORT}`);
});