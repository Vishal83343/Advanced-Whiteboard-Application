import { useRef, useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { Rnd } from "react-rnd";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const MATH_SHAPES = [
  "line", "rectangle", "circle", "ellipse", "triangle", "right_triangle",
  "rhombus", "parallelogram", "trapezoid", "pentagon", "hexagon", 
  "arrow", "axes", "grid", "cylinder"
];

const FONTS = [
  "Arial", "Helvetica", "Verdana", "Tahoma", "Trebuchet MS", "Segoe UI", "Calibri",
  "Times New Roman", "Georgia", "Garamond", "Palatino", "Bookman", "Cambria",
  "Courier New", "Lucida Console", "Monaco", "Consolas", 
  "Impact", "Arial Black", "Comic Sans MS", "Brush Script MT", "Optima", "Didot",
  "Candara", "Constantia", "Corbel", "Franklin Gothic Medium"
];

function Whiteboard() {
  const canvasRef = useRef(null);
  const snapshotRef = useRef(null); 
  const laserCanvasRef = useRef(null);

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
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, text: "" });

  const [slides, setSlides] = useState([""]); 
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  const [bgMode, setBgMode] = useState("white"); 
  
  const [uploadImage, setUploadImage] = useState({ src: "", x: 50, y: 50, w: 300, h: 200 });

  const [showGallery, setShowGallery] = useState(false);
  const [savedBoards, setSavedBoards] = useState([]);

  const fileInputRef = useRef(null);

  // Constants for Canvas Size
  const CANVAS_W = 1200;
  const CANVAS_H = 600;

  useEffect(() => {
    socket.on("receive_draw_data", (data) => {
      const ctx = canvasRef.current.getContext("2d");
      const img = new Image();
      img.src = data;
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0);
      };
    });

    socket.on("receive_clear_board", () => {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    });

    socket.on("receive_load_board", (data) => {
      const ctx = canvasRef.current.getContext("2d");
      const img = new Image();
      img.src = data;
      img.onload = () => {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.drawImage(img, 0, 0);
      };
    });

    return () => {
      socket.off("receive_draw_data");
      socket.off("receive_clear_board");
      socket.off("receive_load_board");
    };
  }, []);

  const broadcastState = () => {
    if (canvasRef.current) {
      socket.emit("draw_data", canvasRef.current.toDataURL());
    }
  };

  const fetchBoards = async () => {
    try {
      const response = await fetch("http://localhost:5000/boards");
      const data = await response.json();
      setSavedBoards(data);
      setShowGallery(true);
    } catch (e) {
      alert("Failed to fetch boards from server.");
      console.error(e);
    }
  };

  const loadBoard = (base64Str) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const currentSlides = [...slides];
      currentSlides[currentSlideIndex] = canvas.toDataURL("image/png");
      const newSlides = [...currentSlides, base64Str];
      setSlides(newSlides);
      setCurrentSlideIndex(newSlides.length - 1);
    }

    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(img, 0, 0);
      saveState(); 
      socket.emit("load_board", base64Str);
    };
    setShowGallery(false);
  };

  const getCanvasBackgroundStyle = () => {
    if (bgMode === "black") return { backgroundColor: "#1e1e1e" };
    if (bgMode === "grid") return { 
      backgroundColor: "white", 
      backgroundImage: "linear-gradient(#e5e5e5 1px, transparent 1px), linear-gradient(90deg, #e5e5e5 1px, transparent 1px)", 
      backgroundSize: "20px 20px" 
    };
    if (bgMode === "lines") return { 
      backgroundColor: "white", 
      backgroundImage: "linear-gradient(#e5e5e5 1px, transparent 1px)", 
      backgroundSize: "100% 30px" 
    };
    return { backgroundColor: "white" };
  };

  const handleBgChange = (newBg) => {
    setBgMode(newBg);
    if (newBg === "black" && color === "#000000") setColor("#ffffff");
    if (newBg !== "black" && color === "#ffffff") setColor("#000000");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const src = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const maxW = 400;
        const maxH = 400;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = w * ratio;
          h = h * ratio;
        }
        setUploadImage({ src, x: (CANVAS_W - w) / 2, y: (CANVAS_H - h) / 2, w, h });
      };
      img.src = src;
    }
  };

  const stampImage = () => {
    if (!uploadImage.src) return;
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, uploadImage.x, uploadImage.y, uploadImage.w, uploadImage.h);
      saveState();
      broadcastState();
      setUploadImage({ src: "", x: 50, y: 50, w: 300, h: 200 });
    };
    img.src = uploadImage.src;
  };

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
    try {
      const response = await fetch("http://localhost:5000/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: canvasData }),
      });
      const result = await response.json();
      if (response.ok) alert("save in MongoDB");
      else alert("Error: " + result.error);
    } catch (error) {
      alert("Oops! Server cannot connected.");
    }
  };

  const loadSlideFromMemory = (index, slideArray) => {
    const ctx = canvasRef.current.getContext("2d");
    if (!slideArray[index]) {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); 
      return;
    }
    const img = new Image();
    img.src = slideArray[index];
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(img, 0, 0);
    };
  };

  const saveCurrentSlideToMemory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newSlides = [...slides];
    newSlides[currentSlideIndex] = canvas.toDataURL("image/png");
    setSlides(newSlides);
    return newSlides;
  };

  const addNewSlide = () => {
    const currentArray = saveCurrentSlideToMemory();
    const newSlides = [...currentArray, ""];
    setSlides(newSlides);
    const nextIdx = newSlides.length - 1;
    setCurrentSlideIndex(nextIdx);
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    setHistory([]);
    setStep(-1);
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      const currentArray = saveCurrentSlideToMemory();
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      loadSlideFromMemory(newIndex, currentArray);
      setHistory([]);
      setStep(-1);
    }
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      const currentArray = saveCurrentSlideToMemory();
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      loadSlideFromMemory(newIndex, currentArray);
      setHistory([]);
      setStep(-1);
    } else {
      addNewSlide(); 
    }
  };

  const downloadPDF = () => {
    const finalSlides = saveCurrentSlideToMemory();
    const pdf = new jsPDF("landscape", "px", [CANVAS_W, CANVAS_H]);
    
    finalSlides.forEach((slideData, i) => {
      if (i > 0) pdf.addPage([CANVAS_W, CANVAS_H], "landscape");
      if (bgMode === "black") {
        pdf.setFillColor(30, 30, 30);
        pdf.rect(0, 0, CANVAS_W, CANVAS_H, 'F');
      }
      if (slideData) {
        pdf.addImage(slideData, "PNG", 0, 0, CANVAS_W, CANVAS_H);
      }
    });
    
    pdf.save("Whiteboard_Lecture.pdf");
  };

  const drawMathShape = (ctx, shapeType, x1, y1, x2, y2) => {
    ctx.beginPath();
    const w = x2 - x1;
    const h = y2 - y1;
    
    if (shapeType === "line") {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    } else if (shapeType === "rectangle") {
      ctx.rect(x1, y1, w, h);
    } else if (shapeType === "circle") {
      const radius = Math.sqrt(w*w + h*h);
      ctx.arc(x1, y1, radius, 0, 2*Math.PI);
    } else if (shapeType === "ellipse") {
      ctx.ellipse(x1 + w/2, y1 + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, 2*Math.PI);
    } else if (shapeType === "triangle") {
      ctx.moveTo(x1 + w/2, y1);
      ctx.lineTo(x1 + w, y2);
      ctx.lineTo(x1, y2);
      ctx.closePath();
    } else if (shapeType === "right_triangle") {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x2, y2);
      ctx.closePath();
    } else if (shapeType === "rhombus") {
      ctx.moveTo(x1 + w/2, y1);
      ctx.lineTo(x2, y1 + h/2);
      ctx.lineTo(x1 + w/2, y2);
      ctx.lineTo(x1, y1 + h/2);
      ctx.closePath();
    } else if (shapeType === "parallelogram") {
      const offset = w * 0.2;
      ctx.moveTo(x1 + offset, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2 - offset, y2);
      ctx.lineTo(x1, y2);
      ctx.closePath();
    } else if (shapeType === "trapezoid") {
      const offset = w * 0.2;
      ctx.moveTo(x1 + offset, y1);
      ctx.lineTo(x2 - offset, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x1, y2);
      ctx.closePath();
    } else if (shapeType === "pentagon") {
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const px = x1 + w/2 + Math.abs(w/2) * Math.cos(angle);
        const py = y1 + h/2 + Math.abs(h/2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shapeType === "hexagon") {
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
        const px = x1 + w/2 + Math.abs(w/2) * Math.cos(angle);
        const py = y1 + h/2 + Math.abs(h/2) * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (shapeType === "arrow") {
      const aw = w * 0.3, ah = h * 0.4;
      ctx.moveTo(x1, y1 + h/2 - ah/2);
      ctx.lineTo(x2 - aw, y1 + h/2 - ah/2);
      ctx.lineTo(x2 - aw, y1);
      ctx.lineTo(x2, y1 + h/2);
      ctx.lineTo(x2 - aw, y2);
      ctx.lineTo(x2 - aw, y1 + h/2 + ah/2);
      ctx.lineTo(x1, y1 + h/2 + ah/2);
      ctx.closePath();
    } else if (shapeType === "axes") {
      ctx.moveTo(x1 + w/2, y1); ctx.lineTo(x1 + w/2, y2);
      ctx.moveTo(x1, y1 + h/2); ctx.lineTo(x2, y1 + h/2);
    } else if (shapeType === "grid") {
      const rows = 5, cols = 5;
      for(let i=0; i<=rows; i++) {
        const py = y1 + (h/rows)*i;
        ctx.moveTo(x1, py); ctx.lineTo(x2, py);
      }
      for(let j=0; j<=cols; j++) {
        const px = x1 + (w/cols)*j;
        ctx.moveTo(px, y1); ctx.lineTo(px, y2);
      }
    } else if (shapeType === "cylinder") {
      const ry = Math.abs(h * 0.15); 
      ctx.ellipse(x1 + w/2, y1 + ry, Math.abs(w/2), ry, 0, 0, 2*Math.PI);
      ctx.moveTo(x1 + w, y2 - ry);
      ctx.ellipse(x1 + w/2, y2 - ry, Math.abs(w/2), ry, 0, 0, Math.PI);
      ctx.moveTo(x1, y1 + ry); ctx.lineTo(x1, y2 - ry);
      ctx.moveTo(x2, y1 + ry); ctx.lineTo(x2, y2 - ry);
    }
    ctx.stroke();
  };

  const startDraw = (e) => {
    const targetRef = tool === "laser" ? laserCanvasRef : canvasRef;
    const ctx = targetRef.current.getContext("2d");
    
    if (tool !== "laser") {
      snapshotRef.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    }

    ctx.strokeStyle = tool === "laser" ? "red" : color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowBlur = 0;

    if (tool === "marker") {
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = size * 2.5; 
    } else if (tool === "pencil") {
      ctx.globalAlpha = 0.6; 
      ctx.lineCap = "butt"; 
    } else if (tool === "pen") {
      ctx.globalAlpha = 1.0;
      ctx.lineCap = "round";
      ctx.shadowBlur = 1; 
      ctx.shadowColor = color;
    } else if (tool === "laser") {
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 15;
      ctx.shadowColor = "red";
      ctx.lineWidth = size;
    } else {
      ctx.globalAlpha = 1.0;
    }

    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    setStartX(x);
    setStartY(y);
    
    if (["pencil", "pen", "marker", "eraser", "laser"].includes(tool)) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    
    const targetRef = tool === "laser" ? laserCanvasRef : canvasRef;
    const ctx = targetRef.current.getContext("2d");
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    
    if (["pencil", "pen", "marker", "laser"].includes(tool)) {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === "eraser") {
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.globalCompositeOperation = 'source-over'; 
    } else if (MATH_SHAPES.includes(tool) || tool === "select_erase") {
      ctx.putImageData(snapshotRef.current, 0, 0); 
      if (tool === "select_erase") {
        ctx.globalAlpha = 1.0;
        ctx.setLineDash([5, 5]); 
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, x - startX, y - startY);
        ctx.setLineDash([]); 
      } else {
        drawMathShape(ctx, tool, startX, startY, x, y);
      }
    }
  };

  const stopDraw = (e) => {
    if (!drawing && tool !== "text") return;
    
    if (tool === "laser") {
      setDrawing(false);
      setTimeout(() => {
        const lCtx = laserCanvasRef.current.getContext("2d");
        lCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      }, 1000);
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (tool === "select_erase") {
      ctx.putImageData(snapshotRef.current, 0, 0);
      const rectX = Math.min(startX, x);
      const rectY = Math.min(startY, y);
      const rectW = Math.abs(x - startX);
      const rectH = Math.abs(y - startY);
      ctx.clearRect(rectX, rectY, rectW, rectH);
    } else if (MATH_SHAPES.includes(tool)) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      drawMathShape(ctx, tool, startX, startY, x, y);
    } else if (tool === "text") {
      setTextInput({ visible: true, x: startX, y: startY, text: "" });
      return; 
    }
    
    setDrawing(false);
    saveState();
    broadcastState();
  };

  const handleTextSubmit = () => {
    if (!textInput.visible) return;
    if (textInput.text.trim() !== "") {
      const ctx = canvasRef.current.getContext("2d");
      let style = "";
      if (bold) style += "bold ";
      if (italic) style += "italic ";
      ctx.font = style + "20px " + font;
      ctx.fillStyle = color;
      ctx.fillText(textInput.text, textInput.x, textInput.y + 20);
      if (underline) {
        const width = ctx.measureText(textInput.text).width;
        ctx.beginPath();
        ctx.moveTo(textInput.x, textInput.y + 25);
        ctx.lineTo(textInput.x + width, textInput.y + 25);
        ctx.stroke();
      }
      saveState();
      broadcastState();
    }
    setTextInput({ visible: false, x: 0, y: 0, text: "" });
    setDrawing(false);
  };

  const clearBoard = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    saveState();
    socket.emit("clear_board");
  };

  const undo = () => {
    if (step <= 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = history[step - 1];
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(img, 0, 0);
      broadcastState();
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
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(img, 0, 0);
      broadcastState();
    };
    setStep(step + 1);
  };

  const resetSettings = () => {
    setTool("pencil");
    setColor("#000000");
    setSize(3);
    setBold(false);
    setItalic(false);
    setUnderline(false);
    setFont("Arial");
    setBgMode("white");
  };

  const btnStyle = { padding: "6px 10px", borderRadius: "4px", border: "none", cursor: "pointer", color: "white", fontWeight: "bold", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center" };
  const selectStyle = { padding: "6px", borderRadius: "4px", background: "#444", color: "white", border: "1px solid #555", cursor: "pointer", fontSize: "13px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: `${CANVAS_W}px`, alignItems: "center", marginBottom: "10px" }}>
        <h2 style={{ color: "#ffffff", fontSize: "24px", fontWeight: "600", margin: 0 }}>Pro Whiteboard</h2>
        
        <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#333", padding: "6px 12px", borderRadius: "6px" }}>
          <button onClick={prevSlide} disabled={currentSlideIndex === 0} style={{ ...btnStyle, background: currentSlideIndex === 0 ? "#555" : "#2196F3" }}>◀ Prev</button>
          <span style={{ color: "white", fontSize: "13px", fontWeight: "bold", minWidth: "60px", textAlign: "center" }}>{currentSlideIndex + 1} / {slides.length}</span>
          <button onClick={nextSlide} style={{ ...btnStyle, background: "#2196F3" }}>Next ▶</button>
          <button onClick={addNewSlide} style={{ ...btnStyle, background: "#4CAF50", marginLeft: "5px" }}>➕ New Slide</button>
        </div>
      </div>

      <div style={{ 
        background: "#2a2a2a", padding: "10px 15px", borderRadius: "8px", 
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)", marginBottom: "15px", display: "flex", 
        flexDirection: "column", gap: "10px", width: `${CANVAS_W}px`, boxSizing: "border-box" 
      }}>
        
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "nowrap", justifyContent: "space-between" }}>
          
          {/* Tools Group */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <select value={["pencil", "pen", "marker", "laser"].includes(tool) ? tool : "none"} onChange={(e) => { 
                if(e.target.value !== "none") {
                  setTool(e.target.value);
                  if (e.target.value === "pen") setColor(bgMode === "black" ? "#ffffff" : "#0000ff"); 
                }
              }} style={{ ...selectStyle, background: ["pencil", "pen", "marker", "laser"].includes(tool) ? "#4CAF50" : "#444", fontWeight: "bold" }}>
              <option value="none">✎ Draw</option>
              <option value="pencil">✎ Pencil</option>
              <option value="pen">🖋 Pen</option>
              <option value="marker">🖍 Marker</option>
              <option value="laser">🔦 Laser</option>
            </select>

            <button onClick={() => setTool("eraser")} style={{ ...btnStyle, background: tool === "eraser" ? "#e91e63" : "#444" }}>▱ Eraser</button>
            <button onClick={() => setTool("select_erase")} style={{ ...btnStyle, background: tool === "select_erase" ? "#ff9800" : "#444", border: tool === "select_erase" ? "1px dashed #fff" : "none" }}>✂️ Erase Box</button>
            <button onClick={() => setTool("text")} style={{ ...btnStyle, background: tool === "text" ? "#607D8B" : "#444" }}>T Text</button>
            
            <select value={MATH_SHAPES.includes(tool) ? tool : "none"} onChange={(e) => { if(e.target.value !== "none") setTool(e.target.value); }} style={{ ...selectStyle, background: MATH_SHAPES.includes(tool) ? "#2196F3" : "#444", fontWeight: "bold" }}>
              <option value="none">⬚ Shapes</option>
              <option value="line">/ Line</option>
              <option value="rectangle">▭ Rectangle</option>
              <option value="circle">◯ Circle</option>
              <option value="ellipse">⬭ Ellipse</option>
              <option value="triangle">△ Triangle</option>
              <option value="right_triangle">⊿ Right Tri</option>
              <option value="rhombus">◇ Rhombus</option>
              <option value="parallelogram">▱ Parallelogram</option>
              <option value="trapezoid">⏢ Trapezoid</option>
              <option value="pentagon">⬠ Pentagon</option>
              <option value="hexagon">⬡ Hexagon</option>
              <option value="cylinder">🛢 Cylinder</option>
              <option value="arrow">➔ Arrow</option>
              <option value="axes">✛ X-Y Axes</option>
              <option value="grid">▦ Grid</option>
            </select>
            
            <div style={{ width: "1px", height: "24px", background: "#555", margin: "0 5px" }} />

            <span style={{ color: "#ddd", fontSize: "13px" }}>Color:</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ cursor: "pointer", border: "none", width: "24px", height: "24px", borderRadius: "4px", padding: 0 }} />
            <span style={{ color: "#ddd", fontSize: "13px", marginLeft: "5px" }}>Size:</span>
            <input type="range" min="1" max="50" value={size} onChange={(e) => setSize(e.target.value)} style={{ cursor: "pointer", width: "80px" }} />
          </div>

          {/* Action Group 1 */}
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={undo} style={{ ...btnStyle, background: "#555" }}>↶</button>
            <button onClick={redo} style={{ ...btnStyle, background: "#555" }}>↷</button>
            <button onClick={clearBoard} style={{ ...btnStyle, background: "#f44336" }}>🗑 Clear</button>
          </div>
        </div>

        <div style={{ width: "100%", height: "1px", background: "#444" }} />

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "nowrap", justifyContent: "space-between" }}>
          
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <select value={bgMode} onChange={(e) => handleBgChange(e.target.value)} style={selectStyle}>
              <option value="white">⬜ Whiteboard</option>
              <option value="black">⬛ Blackboard</option>
              <option value="grid">▦ Grid</option>
              <option value="lines">📝 Lines</option>
            </select>
            
            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: "none" }} onChange={handleImageUpload} />
            <button onClick={() => fileInputRef.current.click()} style={{ ...btnStyle, background: "#444", border: "1px solid #777" }}>🖼️ Image</button>

            <div style={{ width: "1px", height: "24px", background: "#555", margin: "0 5px" }} />

            <select value={font} onChange={(e) => setFont(e.target.value)} style={{ ...selectStyle, maxWidth: "100px" }}>
              {FONTS.map(f => ( <option key={f} value={f} style={{ fontFamily: f }}>{f}</option> ))}
            </select>
            <button onClick={() => setBold(!bold)} style={{ ...btnStyle, background: bold ? "#bbb" : "#444", color: bold ? "#000" : "white" }}>B</button>
            <button onClick={() => setItalic(!italic)} style={{ ...btnStyle, background: italic ? "#bbb" : "#444", color: italic ? "#000" : "white", fontStyle: "italic" }}>I</button>
            <button onClick={() => setUnderline(!underline)} style={{ ...btnStyle, background: underline ? "#bbb" : "#444", color: underline ? "#000" : "white", textDecoration: "underline" }}>U</button>
            <button onClick={resetSettings} style={{ ...btnStyle, background: "transparent", border: "1px solid #777", color: "#ddd" }}>↺ Reset</button>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={downloadPDF} style={{ ...btnStyle, background: "#ff5722" }}>📄 PDF</button>
            <button onClick={saveToMongoDB} style={{ ...btnStyle, background: "#673ab7" }}>💾 Save DB</button>
            <button onClick={fetchBoards} style={{ ...btnStyle, background: "#009688" }}>📂 My Boards</button>
          </div>
        </div>
      </div>

      <div style={{ position: "relative", display: "inline-block" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ 
            ...getCanvasBackgroundStyle(),
            border: "none", borderRadius: "8px", 
            cursor: tool === "select_erase" ? "crosshair" : tool === "text" ? "text" : tool === "eraser" ? "crosshair" : "default",
            boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
            position: "absolute", left: 0, top: 0, zIndex: 1
          }}
        />
        
        <canvas
          ref={laserCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ 
            position: "relative", zIndex: 2, borderRadius: "8px",
            cursor: tool === "select_erase" ? "crosshair" : tool === "text" ? "text" : tool === "eraser" ? "crosshair" : tool === "laser" ? "crosshair" : "default",
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseOut={stopDraw}
        />
        
        {uploadImage.src && (
          <Rnd
            position={{ x: uploadImage.x, y: uploadImage.y }}
            size={{ width: uploadImage.w, height: uploadImage.h }}
            onDragStop={(e, d) => setUploadImage((prev) => ({ ...prev, x: d.x, y: d.y }))}
            onResizeStop={(e, direction, ref, delta, position) => {
              setUploadImage((prev) => ({
                ...prev,
                w: parseInt(ref.style.width, 10),
                h: parseInt(ref.style.height, 10),
                ...position,
              }));
            }}
            bounds="parent"
            style={{ border: "2px dashed #2196F3", zIndex: 4, cursor: "move" }}
          >
            <img src={uploadImage.src} alt="upload" style={{ width: "100%", height: "100%", pointerEvents: "none", userSelect: "none" }} />
            <div style={{ position: "absolute", top: "-30px", right: "0", display: "flex", gap: "5px" }}>
              <button onClick={() => setUploadImage({ src: "", x: 50, y: 50, w: 300, h: 200 })} style={{ ...btnStyle, background: "#f44336", fontSize: "11px", padding: "4px 8px" }}>✖ Cancel</button>
              <button onClick={stampImage} style={{ ...btnStyle, background: "#4CAF50", fontSize: "11px", padding: "4px 8px" }}>✔ Place Image</button>
            </div>
          </Rnd>
        )}

        {textInput.visible && (
          <input
            type="text"
            autoFocus
            value={textInput.text}
            onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") handleTextSubmit(); }}
            onBlur={handleTextSubmit}
            style={{
              position: "absolute",
              left: textInput.x,
              top: textInput.y,
              fontFamily: font,
              fontSize: "20px",
              fontWeight: bold ? "bold" : "normal",
              fontStyle: italic ? "italic" : "normal",
              textDecoration: underline ? "underline" : "none",
              color: color,
              background: "transparent",
              border: "1px dashed #444",
              outline: "none",
              padding: 0,
              margin: 0,
              minWidth: "100px",
              zIndex: 3
            }}
          />
        )}
      </div>

      {showGallery && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.8)", zIndex: 10, display: "flex", 
          justifyContent: "center", alignItems: "center"
        }}>
          <div style={{
            background: "#2a2a2a", padding: "20px", borderRadius: "12px", width: "80%", height: "80%",
            overflowY: "auto", position: "relative", boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
             <h2 style={{ color: "white", marginTop: 0, marginBottom: "20px", borderBottom: "1px solid #444", paddingBottom: "10px" }}>My Saved Boards</h2>
             <button onClick={() => setShowGallery(false)} style={{ position: "absolute", top: 20, right: 20, padding: "8px 16px", background: "#f44336", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>✖ Close</button>
             
             {savedBoards.length === 0 ? (
                <p style={{ color: "#aaa", textAlign: "center", marginTop: "50px", fontSize: "18px" }}>No boards saved yet in MongoDB.</p>
             ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                  {savedBoards.map(board => (
                     <div key={board._id} style={{ background: "#444", borderRadius: "8px", padding: "10px", cursor: "pointer", transition: "transform 0.2s" }} onClick={() => loadBoard(board.image)} onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"} onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}>
                       <img src={board.image} alt="Board" style={{ width: "100%", height: "150px", objectFit: "contain", background: "white", borderRadius: "4px" }} />
                       <p style={{ color: "white", fontSize: "12px", textAlign: "center", marginTop: "10px" }}>
                          {new Date(board.createdAt).toLocaleString()}
                       </p>
                     </div>
                  ))}
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Whiteboard;