import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Stage, Layer, Line } from 'react-konva';
import { useStore } from '../store/useStore';
import { Send, ArrowLeft } from 'lucide-react';

export default function SessionWorkspace() {
  const { sessionId } = useParams();
  const { user } = useStore();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [chatMessages, setChatMessages] = useState<{sender: string, text: string}[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const isDrawing = useRef(false);

  useEffect(() => {
    // Connect to Socket.io server
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    newSocket.emit('join-room', sessionId);

    newSocket.on('canvas-draw', (data) => {
      setLines(data.lines);
    });

    newSocket.on('note-update', (data) => {
      setNotes(data.notes);
    });

    newSocket.on('chat-message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId]);

  const handleMouseDown = (e: any) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool: 'pen', points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing.current) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    
    const newLines = lines.slice(0, lines.length - 1).concat(lastLine);
    setLines(newLines);
    socket?.emit('canvas-draw', { roomId: sessionId, lines: newLines });
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    socket?.emit('note-update', { roomId: sessionId, notes: newNotes });
  };

  const sendChatMessage = () => {
    if (!newChatMessage.trim() || !user) return;
    const msg = { sender: user.displayName || user.email?.split('@')[0] || 'User', text: newChatMessage };
    setChatMessages(prev => [...prev, msg]);
    socket?.emit('chat-message', { roomId: sessionId, ...msg });
    setNewChatMessage('');
  };

  return (
    <div className="h-screen flex flex-col bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sessions')} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <h1 className="text-xl font-bold">Collaborative Workspace</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/sessions')} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium text-sm">Leave Session</button>
        </div>
      </header>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Whiteboard */}
        <div className="flex-1 bg-white m-4 rounded-2xl border border-stone-200 shadow-sm overflow-hidden relative">
          <div className="absolute top-4 left-4 z-10 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-stone-200 text-sm font-medium text-stone-600">
            Shared Whiteboard
          </div>
          <Stage
            width={window.innerWidth * 0.6}
            height={window.innerHeight - 100}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
          >
            <Layer>
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke="#4f46e5"
                  strokeWidth={3}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
            </Layer>
          </Stage>
        </div>

        {/* Sidebar: Shared Notes & Chat */}
        <div className="w-96 m-4 ml-0 flex flex-col gap-4">
          {/* Shared Notes */}
          <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50">
              <h2 className="font-bold text-stone-700">Shared Notes</h2>
            </div>
            <textarea
              value={notes}
              onChange={handleNoteChange}
              className="flex-1 p-4 resize-none focus:outline-none text-stone-700"
              placeholder="Type collaborative notes here..."
            />
          </div>

          {/* Chat */}
          <div className="h-1/2 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-stone-200 bg-stone-50">
              <h2 className="font-bold text-stone-700">Session Chat</h2>
            </div>
            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="font-bold text-xs text-indigo-600 block mb-1">{msg.sender}</span>
                  <p className="text-sm text-stone-700">{msg.text}</p>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <p className="text-sm text-stone-400 text-center mt-4">No messages yet.</p>
              )}
            </div>
            <div className="p-3 border-t border-stone-200 flex gap-2">
              <input 
                type="text" 
                value={newChatMessage}
                onChange={(e) => setNewChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button 
                onClick={sendChatMessage}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
