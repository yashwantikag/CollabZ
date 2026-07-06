import { useState, useEffect, useRef } from 'react'
import { encryptData, decryptData } from '../utils/cryptoHelper'

const SECRET_KEY = import.meta.env.VITE_SOCKET_ENCRYPTION_KEY || 'default-fallback-key-32chars-for-aes';

export default function Whiteboard({ 
  socket, 
  roomId, 
  userName,
  history,
  setHistory,
  historyIndex,
  setHistoryIndex,
  isExplainMode,
  setIsExplainMode,
  explainModeSpeaker,
  inCall = false
}) {
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastX = useRef(0)
  const lastY = useRef(0)

  const [tool, setTool] = useState('pen') // 'pen' or 'eraser'
  const [color, setColor] = useState('#6366f1') // Default Indigo
  const [lineWidth, setLineWidth] = useState(4)

  const colors = [
    { value: '#6366f1', name: 'Indigo' },
    { value: '#ec4899', name: 'Pink' },
    { value: '#10b981', name: 'Emerald' },
    { value: '#f59e0b', name: 'Amber' },
    { value: '#0f172a', name: 'Dark Slate' },
  ]

  // Setup Canvas resize and drawing history recovery
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const parentRect = canvas.parentElement.getBoundingClientRect()
    canvas.width = parentRect.width
    canvas.height = parentRect.height

    // Set solid white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(canvas, ctx)

    // Restore history if it exists
    if (history.length > 0 && historyIndex >= 0 && history[historyIndex]) {
      const img = new Image()
      img.src = history[historyIndex]
      img.onload = () => {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        drawGrid(canvas, ctx)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
    } else {
      // Save initial blank state
      const initial = canvas.toDataURL()
      setHistory([initial])
      setHistoryIndex(0)
    }

    const handleResize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      
      // Save current content temporarily
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext('2d')
      tempCtx.drawImage(canvas, 0, 0)

      // Resize original canvas
      canvas.width = rect.width
      canvas.height = rect.height
      
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawGrid(canvas, ctx)

      // Redraw old content (it might stretch or clip slightly, which is expected on window resize)
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [historyIndex])

  // Setup Socket listener for strokes
  useEffect(() => {
    if (!socket) return

    const handleReceiveStroke = async (encryptedPayload) => {
      try {
        const decryptedString = await decryptData(encryptedPayload, SECRET_KEY)
        const stroke = JSON.parse(decryptedString)
        
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return

        const w = canvas.width
        const h = canvas.height

        // Translate relative coordinates back to absolute coordinates
        const x0 = stroke.rx0 * w
        const y0 = stroke.ry0 * h
        const x1 = stroke.rx1 * w
        const y1 = stroke.ry1 * h

        ctx.beginPath()
        ctx.moveTo(x0, y0)
        ctx.lineTo(x1, y1)
        ctx.strokeStyle = stroke.color
        ctx.lineWidth = stroke.lineWidth
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      } catch (err) {
        console.error('Failed to decrypt drawing stroke:', err)
      }
    }

    socket.on('receive-draw-stroke', handleReceiveStroke)
    return () => {
      socket.off('receive-draw-stroke', handleReceiveStroke)
    }
  }, [socket])

  const drawGrid = (canvas, ctx) => {
    ctx.strokeStyle = '#f1f5f9' // light slate grid
    ctx.lineWidth = 1
    const gridSize = 45
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }

  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    const { x, y } = getCoordinates(e)
    isDrawing.current = true
    lastX.current = x
    lastY.current = y
  }

  const draw = async (e) => {
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const { x, y } = getCoordinates(e)
    const w = canvas.width
    const h = canvas.height

    const strokeColor = tool === 'eraser' ? '#ffffff' : color
    const strokeWidth = tool === 'eraser' ? lineWidth * 3.5 : lineWidth

    ctx.beginPath()
    ctx.moveTo(lastX.current, lastY.current)
    ctx.lineTo(x, y)
    
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Emit relative coordinate values so drawing scales correctly for remote screens
    if (socket) {
      const rx0 = lastX.current / w
      const ry0 = lastY.current / h
      const rx1 = x / w
      const ry1 = y / h

      const strokeData = {
        rx0,
        ry0,
        rx1,
        ry1,
        color: strokeColor,
        lineWidth: strokeWidth
      }

      try {
        const encrypted = await encryptData(JSON.stringify(strokeData), SECRET_KEY)
        
        if (roomId) {
          socket.emit('draw-stroke', { roomId, encryptedPayload: encrypted })
        } else {
          socket.emit('draw-stroke', encrypted)
        }
      } catch (err) {
        console.error('Encryption failed for drawing stroke:', err)
      }
    }

    lastX.current = x
    lastY.current = y
  }

  const stopDrawing = () => {
    if (!isDrawing.current) return
    isDrawing.current = false
    saveCanvasState()
  }

  const saveCanvasState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const state = canvas.toDataURL()
    
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(state)
    
    if (newHistory.length > 25) {
      newHistory.shift()
      setHistoryIndex(newHistory.length - 1)
    } else {
      setHistoryIndex(newHistory.length - 1)
    }
    setHistory(newHistory)
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const newIndex = historyIndex - 1
    const img = new Image()
    img.src = history[newIndex]
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawGrid(canvas, ctx)
      ctx.drawImage(img, 0, 0)
      setHistoryIndex(newIndex)
    }
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const newIndex = historyIndex + 1
    const img = new Image()
    img.src = history[newIndex]
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drawGrid(canvas, ctx)
      ctx.drawImage(img, 0, 0)
      setHistoryIndex(newIndex)
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(canvas, ctx)
    saveCanvasState()
  }

  const toggleExplainMode = () => {
    if (!socket || !roomId) return
    const nextExplainMode = !isExplainMode
    setIsExplainMode(nextExplainMode)
    socket.emit('explain-mode-toggle', {
      roomId,
      isExplainMode: nextExplainMode,
      speakerName: userName
    })
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col">
      {/* Canvas Toolbar Container */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 border border-slate-800/80 px-4 py-2.5 rounded-2xl flex items-center gap-5 shadow-2xl backdrop-blur-md z-20">
        
        {/* Explain Mode Toggle Button (Only in meeting call context) */}
        {inCall && roomId && (
          <button
            onClick={toggleExplainMode}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all border flex items-center gap-1.5 ${
              isExplainMode 
                ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-600/20' 
                : 'bg-slate-950/60 hover:bg-slate-850 text-slate-300 border-slate-800'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isExplainMode ? 'bg-white animate-ping' : 'bg-rose-500'}`}></span>
            Explain Mode
          </button>
        )}

        {/* Tool Selectors */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800/40">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            title="Pen Tool"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            title="Eraser Tool"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>
        </div>

        {/* Color Palette */}
        <div className={`flex items-center gap-1.5 transition-all duration-300 ${tool === 'eraser' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {colors.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-all relative ${color === c.value ? 'scale-110 border-indigo-500 shadow-md' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            >
              {color === c.value && (
                <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px]">✓</span>
              )}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-slate-800"></div>

        {/* Brush Sizes */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Size</span>
          <div className="flex items-center gap-1">
            {[2, 4, 8, 16].map((size) => (
              <button
                key={size}
                onClick={() => setLineWidth(size)}
                className={`w-6 h-6 rounded flex items-center justify-center transition-all ${lineWidth === size ? 'bg-slate-800 text-slate-100 border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: `${Math.max(2, size / 1.5)}px`, height: `${Math.max(2, size / 1.5)}px` }}
                ></span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800"></div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-all"
            title="Undo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-all"
            title="Redo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3" />
            </svg>
          </button>
          <button
            onClick={clearCanvas}
            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all ml-1"
            title="Clear All"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {/* Draw Board */}
      <div className="flex-1 w-full h-full relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 block w-full h-full"
        />
      </div>

      {/* Status Overlay Info */}
      <div className="absolute bottom-4 left-4 bg-slate-900/60 border border-slate-800/40 text-[9px] px-2.5 py-1 rounded font-mono text-slate-400 backdrop-blur-sm pointer-events-none select-none">
        {tool.toUpperCase()} MODE • SIZE: {lineWidth}PX • COLOR: {color.toUpperCase()} {roomId ? `• ROOM: ${roomId}` : ''}
      </div>

      {/* Synchronized layout alert (Explain mode banner) */}
      {roomId && explainModeSpeaker && (
        <div className="absolute bottom-4 right-4 bg-indigo-950/80 border border-indigo-800 text-[10px] px-3.5 py-2 rounded-xl text-indigo-200 backdrop-blur-md flex items-center gap-2 select-none animate-pulse">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          <span>Presenter <strong>{explainModeSpeaker}</strong> is presenting in Explain Mode.</span>
        </div>
      )}
    </div>
  )
}
