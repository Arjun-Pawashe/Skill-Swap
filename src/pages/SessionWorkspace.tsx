import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Stage, Layer, Line } from 'react-konva';
import { useStore } from '../store/useStore';
import { Send, ArrowLeft, Pencil, Eraser, Video } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';

const COLORS = [
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Black', value: '#1c1917' },
];

export default function SessionWorkspace() {
  const { sessionId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string}[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [selectedColor, setSelectedColor] = useState('#4f46e5');
  const [tool, setTool] = useState('pen');
  const isDrawing = useRef(false);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    // Connect to Socket.io server
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.emit('join-room', sessionId);

    // Socket.io for real-time ephemeral drawing (seeing the pen move)
    newSocket.on('canvas-draw-stroke', (data) => {
      isRemoteUpdate.current = true;
      setLines(prev => {
        const newLines = [...prev];
        if (data.isNew) {
          newLines.push(data.line);
        } else {
          newLines[newLines.length - 1] = data.line;
        }
        return newLines;
      });
      setTimeout(() => { isRemoteUpdate.current = false; }, 50);
    });

    // Firestore for persistent state and initial sync
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Only update if we are not currently drawing to avoid flickering
        if (!isDrawing.current && !isRemoteUpdate.current) {
          if (data.whiteboardData) {
            try {
              setLines(JSON.parse(data.whiteboardData));
            } catch (e) {
              console.error("Error parsing whiteboard data", e);
            }
          }
          if (data.notesData !== undefined) {
            setNotes(data.notesData);
          }
          if (data.chatData) {
            setChatMessages(data.chatData);
          }
        }
      }
    });

    return () => {
      newSocket.disconnect();
      unsubscribe();
    };
  }, [sessionId]);

  const handleMouseDown = (e: any) => {
    if (!sessionId) return;
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    const newLine = { tool, color: selectedColor, points: [pos.x, pos.y] };
    const updatedLines = [...lines, newLine];
    setLines(updatedLines);
    
    // Broadcast new stroke start
    socket?.emit('canvas-draw-stroke', { roomId: sessionId, line: newLine, isNew: true });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current || !sessionId) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setLines(prev => {
      const newLines = [...prev];
      const lastLine = { ...newLines[newLines.length - 1] };
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      newLines[newLines.length - 1] = lastLine;
      
      // Broadcast stroke update
      socket?.emit('canvas-draw-stroke', { roomId: sessionId, line: lastLine, isNew: false });
      
      return newLines;
    });
  };

  const handleMouseUp = async () => {
    isDrawing.current = false;
    if (!sessionId) return;

    // Save full state to Firestore on stroke end
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        whiteboardData: JSON.stringify(lines)
      });
    } catch (error) {
      console.error("Error saving whiteboard to Firestore", error);
    }
  };

  const handleNoteChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    if (!sessionId) return;

    // Save to Firestore (ideally debounced, but let's keep it simple for now)
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        notesData: newNotes
      });
    } catch (error) {
      console.error("Error saving notes to Firestore", error);
    }
  };

  const sendChatMessage = async () => {
    if (!newChatMessage.trim() || !user || !sessionId) return;
    const msg = { 
      sender: user.displayName || user.email?.split('@')[0] || 'User', 
      text: newChatMessage,
      timestamp: new Date().toISOString()
    };
    
    setNewChatMessage('');

    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        chatData: arrayUnion(msg)
      });
    } catch (error) {
      console.error("Error sending chat message to Firestore", error);
    }
  };

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      <header className="bg-white border-b border-stone-200 px-4 md:px-6 py-3 md:py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => navigate('/sessions')} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-lg md:text-xl font-bold truncate max-w-[150px] md:max-w-none">Workspace</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate(`/meet/${sessionId}`)}
            className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 text-white rounded-lg font-medium text-xs md:text-sm flex items-center gap-2"
          >
            <Video className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Video Call</span>
          </button>
          <button onClick={() => navigate('/sessions')} className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-xs md:text-sm">Leave</button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Whiteboard */}
        <div className="flex-1 bg-white m-2 md:m-4 rounded-2xl border border-stone-200 shadow-sm overflow-hidden relative" ref={containerRef}>
          <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-4">
            <div className="bg-white/80 backdrop-blur-sm px-2 py-1 md:px-3 md:py-1.5 rounded-lg shadow-sm border border-stone-200 text-[10px] md:text-sm font-medium text-stone-600">
              Whiteboard
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 bg-white/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-stone-200">
              <button 
                onClick={() => setTool('pen')}
                className={`p-1 md:p-1.5 rounded-md transition-colors ${tool === 'pen' ? 'bg-indigo-50 text-indigo-600' : 'text-stone-400 hover:bg-stone-50'}`}
              >
                <Pencil className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              <button 
                onClick={() => setTool('eraser')}
                className={`p-1 md:p-1.5 rounded-md transition-colors ${tool === 'eraser' ? 'bg-indigo-50 text-indigo-600' : 'text-stone-400 hover:bg-stone-50'}`}
              >
                <Eraser className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              <div className="w-px h-4 bg-stone-200 mx-0.5 md:mx-1" />
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setSelectedColor(c.value);
                    setTool('pen');
                  }}
                  className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 transition-transform ${selectedColor === c.value && tool === 'pen' ? 'scale-110 md:scale-125 border-stone-300' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
            onTouchEnd={handleMouseUp}
          >
            <Layer>
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke={line.tool === 'eraser' ? '#ffffff' : line.color}
                  strokeWidth={line.tool === 'eraser' ? 20 : 3}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === 'eraser' ? 'destination-out' : 'source-over'
                  }
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Sidebar: Shared Notes & Chat */}
        <div className="w-full lg:w-80 xl:w-96 m-2 md:m-4 lg:ml-0 flex flex-col sm:flex-row lg:flex-col gap-2 md:gap-4 shrink-0 overflow-hidden">
          {/* Shared Notes */}
          <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden min-h-[200px]">
            <div className="p-3 md:p-4 border-b border-stone-200 bg-stone-50">
              <h2 className="font-bold text-sm md:text-base text-stone-700">Shared Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={handleNoteChange}
              className="flex-1 p-3 md:p-4 resize-none focus:outline-none text-sm md:text-base text-stone-700"
              placeholder="Type collaborative notes here..."
            />
          </div>

          {/* Chat */}
          <div className="flex-1 lg:h-1/2 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden min-h-[250px]">
            <div className="p-3 md:p-4 border-b border-stone-200 bg-stone-50">
              <h2 className="font-bold text-sm md:text-base text-stone-700">Session Chat</h2>
            </div>
            <div className="flex-1 p-3 md:p-4 overflow-y-auto flex flex-col gap-2 md:gap-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className="bg-stone-50 p-2 md:p-3 rounded-xl border border-stone-100">
                  <span className="font-bold text-[10px] md:text-xs text-indigo-600 block mb-0.5 md:mb-1">{msg.sender}</span>
                  <p className="text-xs md:text-sm text-stone-700">{msg.text}</p>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <p className="text-xs md:text-sm text-stone-400 text-center mt-4">No messages yet.</p>
              )}
            </div>
            <div className="p-2 md:p-3 border-t border-stone-200 flex gap-2">
              <input 
                type="text" 
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Message..."
                className="flex-1 px-3 py-1.5 md:py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button 
                onClick={sendChatMessage}
                className="p-1.5 md:p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
