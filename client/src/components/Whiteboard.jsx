import { useRef, useState } from "react";

function Whiteboard() {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(3);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [font, setFont] = useState("Arial");
  const [history, setHistory] = useState([]);
  const [step, setStep] = useState(-1);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL();
    const newHistory = history.slice(0, step + 1);
    newHistory.push(data);
    setHistory(newHistory);
    setStep(newHistory.length - 1);
  };

  
  const saveToMongoDB = async () => {
    const canvas = canvasRef.current;
    const canvasData = canvas.toDataURL("image/png");

    console.log("Saving to DB...");

    try {
      
      const response = await fetch("http://localhost:5000/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: canvasData }),
      });

      const result = await response.json();
      if (response.ok) {
        alert("save in MongoDB");
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Saving failed:", error);
      alert("Oops! Server cannot connected.");
    }
  };

  const startDraw = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    setStartX(x);
    setStartY(y);
    if (tool === "pencil" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext("2d");
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    if (tool === "pencil") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    if (tool === "eraser") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDraw = (e) => {
    if (!drawing) return;
    const ctx = canvasRef.current.getContext("2d");
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (tool === "line") {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === "rectangle") {
      ctx.strokeRect(startX, startY, x - startX, y - startY);
    } else if (tool === "circle") {
      const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
      ctx.beginPath();
      ctx.arc(startX, startY, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tool === "text") {
      const text = prompt("Enter text");
      if (text) {
        let style = "";
        if (bold) style += "bold ";
        if (italic) style += "italic ";
        ctx.font = style + "20px " + font;
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        if (underline) {
          const width = ctx.measureText(text).width;
          ctx.beginPath();
          ctx.moveTo(x, y + 5);
          ctx.lineTo(x + width, y + 5);
          ctx.stroke();
        }
      }
    }
    setDrawing(false);
    saveState();
  };

  const clearBoard = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 900, 500);
    saveState();
  };

  const undo = () => {
    if (step <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = history[step - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, 900, 500);
      ctx.drawImage(img, 0, 0);
    };
    setStep(step - 1);
  };

  const redo = () => {
    if (step >= history.length - 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = history[step + 1];
    img.onload = () => {
      ctx.clearRect(0, 0, 900, 500);
      ctx.drawImage(img, 0, 0);
    };
    setStep(step + 1);
  };

  const download = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2 style={{ color: "#333" }}>Advanced Whiteboard</h2>

      <div style={{ background: "#f2f2f2", padding: "12px", borderRadius: "10px", marginBottom: "10px" }}>
        <button onClick={() => setTool("pencil")} style={{ margin: "2px", background: "#4CAF50", color: "white" }}>Pencil</button>
        <button onClick={() => setTool("eraser")} style={{ margin: "2px", background: "#e91e63", color: "white" }}>Eraser</button>
        <button onClick={() => setTool("line")} style={{ margin: "2px", background: "#2196F3", color: "white" }}>Line</button>
        <button onClick={() => setTool("rectangle")} style={{ margin: "2px", background: "#FF9800", color: "white" }}>Rectangle</button>
        <button onClick={() => setTool("circle")} style={{ margin: "2px", background: "#9C27B0", color: "white" }}>Circle</button>
        <button onClick={() => setTool("text")} style={{ margin: "2px", background: "#607D8B", color: "white" }}>Text</button>

        <br /><br />

        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        <input type="range" min="1" max="20" value={size} onChange={(e) => setSize(e.target.value)} />

        <select onChange={(e) => setFont(e.target.value)} style={{ margin: "0 10px" }}>
          <option>Arial</option>
          <option>Verdana</option>
          <option>Tahoma</option>
          <option>Impact</option>
        </select>

        <button onClick={() => setBold(!bold)} style={{ fontWeight: bold ? "bold" : "normal" }}>B</button>
        <button onClick={() => setItalic(!italic)} style={{ fontStyle: italic ? "italic" : "normal" }}>I</button>
        <button onClick={() => setUnderline(!underline)}>U</button>

        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={clearBoard}>Clear</button>
        <button onClick={download}>Download</button>

        <button onClick={saveToMongoDB} style={{ background: "#673ab7", color: "white", fontWeight: "bold", marginLeft: "10px" }}>
          Save to DB
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={900}
        height={500}
        style={{ border: "3px solid #444", background: "white", borderRadius: "10px", cursor: tool === "eraser" ? "crosshair" : "default" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
      />
    </div>
  );
}

export default Whiteboard;