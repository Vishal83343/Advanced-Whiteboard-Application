const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();


app.use(express.json({ limit: '10mb' })); 
app.use(cors());


const mongoURI = 'mongodb://localhost:27017/whiteboard';

mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB Compass se connection successful!"))
  .catch(err => console.log("Connection error:", err));


const BoardSchema = new mongoose.Schema({
  image: String, 
  createdAt: { type: Date, default: Date.now }
});

const Board = mongoose.model('Board', BoardSchema);


app.post('/api/save-board', async (req, res) => {
  try {
    const newBoard = new Board({ image: req.body.image });
    await newBoard.save();
    res.status(200).json({ message: "Drawing Compass mein save ho gayi!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));