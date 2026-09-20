# 🎨 Advanced Real-Time Whiteboard Application

A full-stack, real-time interactive whiteboard application built using the MERN stack (MongoDB, Express, React, Node.js) and Socket.io. This application allows multiple users to draw, collaborate, and share a digital canvas simultaneously over the internet.

## 🚀 Key Features

*   **Real-Time Multiplayer Collaboration:** Draw on the canvas and watch it instantly appear on other users' screens via Socket.io.
*   **Advanced Drawing Tools:** Freehand pen, eraser, and an area-selection erasing tool.
*   **Rich Math & Geometry Shapes:** Over 15+ built-in shapes including rectangles, circles, triangles, arrows, coordinate axes, and grids, with live drag-preview.
*   **Fading Laser Pointer:** A special laser pointer tool for teaching that draws on a secondary layered canvas and automatically fades away after 1 second without damaging the permanent drawing.
*   **Image Drag & Drop:** Upload images, resize them, and drag them around the canvas using `react-rnd` before permanently stamping them onto the board.
*   **Slide System & PDF Export:** Create multiple slides/pages for a presentation and export the entire deck as a multi-page PDF document using `jspdf`.
*   **Dynamic Backgrounds:** Switch between Whiteboard, Blackboard, Graph Paper, and Notebook lines.
*   **Cloud Gallery:** Save your current board state directly to a MongoDB database and retrieve it later via the "My Boards" gallery interface.
*   **History (Undo/Redo):** Complete state management for undoing and redoing strokes.

---

## 💻 Tech Stack

### Frontend (Client)
*   **React.js (Vite):** Fast, component-based UI rendering.
*   **HTML5 Canvas API:** Low-level API for high-performance pixel drawing and context manipulation.
*   **Socket.io-client:** For listening and emitting real-time WebSocket events.
*   **jsPDF:** To capture the canvas data URL and convert it into a downloadable PDF.
*   **react-rnd:** For resizable and draggable floating components (used for image insertion).

### Backend (Server)
*   **Node.js & Express.js:** RESTful API architecture.
*   **Socket.io:** Handles WebSocket connections and broadcasts drawing data to all connected clients.
*   **MongoDB & Mongoose:** NoSQL database to store Base64 encoded image strings of the canvas.
*   **Cors:** Middleware to allow cross-origin requests between the Vite frontend and Express backend.

---

## 🛠️ Installation & Setup

To run this project locally, you will need two separate terminal windows (one for the frontend and one for the backend).

### Prerequisites
*   [Node.js](https://nodejs.org/) installed.
*   A local MongoDB instance running on `localhost:27017` (or change the connection string in `server.js` to a MongoDB Atlas cluster URL).

### 1. Backend Setup (Terminal 1)
```bash
# Navigate to the server directory
cd server

# Install backend dependencies
npm install

# Start the Node/Express server
node server.js
```
*The server will start on `http://localhost:5000` and connect to MongoDB.*

### 2. Frontend Setup (Terminal 2)
```bash
# Navigate to the client directory
cd client

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend will start on `http://localhost:5173`. Open this URL in multiple browser tabs to test the real-time multiplayer features!*

---

## 🏗️ Architecture & Challenges Solved

*   **The Live Preview Problem:** When dragging to draw shapes on a canvas, redrawing continuously leaves a "trail" of shapes. This was solved by capturing the canvas state using `getImageData()` on `mouseDown`, and constantly restoring it using `putImageData()` during `mouseMove` before drawing the new preview shape.
*   **The Raster Image Problem:** Uploaded images cannot be moved once drawn on a raster canvas. Solved by rendering the image as a floating HTML `<img>` element inside a `react-rnd` wrapper. Once positioned perfectly, a "Place Image" button burns it into the canvas using `ctx.drawImage()`.

---

## 📝 License
This project is open-source and available for educational and non-commercial use.
