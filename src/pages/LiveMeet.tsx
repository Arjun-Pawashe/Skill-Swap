import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { io, Socket } from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Sparkles, X, Copy, Check } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const SOCKET_URL = window.location.origin;

export default function LiveMeet() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useStore();
  const navigate = useNavigate();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [aiSolution, setAiSolution] = useState<string | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<{ [id: string]: RTCPeerConnection }>({});

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    const initMedia = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error("Error accessing media devices.", err);
        stream = new MediaStream();
      }
      
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

      const processPendingCandidates = async (userId: string, pc: RTCPeerConnection) => {
        const candidates = pendingCandidates.get(userId);
        if (candidates) {
          for (const candidate of candidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error("Error adding pending ICE candidate", e);
            }
          }
          pendingCandidates.delete(userId);
        }
      };

      newSocket.emit('join-meet', roomId);

      newSocket.on('user-connected', async (userId: string) => {
        console.log('User connected:', userId);
        const pc = createPeerConnection(userId, newSocket, stream);
        peerConnectionsRef.current[userId] = pc;

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          newSocket.emit('offer', { target: userId, sdp: offer });
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      });

      newSocket.on('offer', async ({ callerId, sdp }) => {
        console.log('Received offer from:', callerId);
        const pc = createPeerConnection(callerId, newSocket, stream);
        peerConnectionsRef.current[callerId] = pc;

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await processPendingCandidates(callerId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          newSocket.emit('answer', { target: callerId, sdp: answer });
        } catch (err) {
          console.error("Error handling offer:", err);
        }
      });

      newSocket.on('answer', async ({ callerId, sdp }) => {
        console.log('Received answer from:', callerId);
        const pc = peerConnectionsRef.current[callerId];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            await processPendingCandidates(callerId, pc);
          } catch (err) {
            console.error("Error handling answer:", err);
          }
        }
      });

      newSocket.on('ice-candidate', async ({ callerId, candidate }) => {
        const pc = peerConnectionsRef.current[callerId];
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        } else {
          const candidates = pendingCandidates.get(callerId) || [];
          candidates.push(candidate);
          pendingCandidates.set(callerId, candidates);
        }
      });

        newSocket.on('user-disconnected', (userId: string) => {
          if (peerConnectionsRef.current[userId]) {
            peerConnectionsRef.current[userId].close();
            delete peerConnectionsRef.current[userId];
          }
          setPeers((prev) => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
          });
        });
    };

    initMedia();

    return () => {
      newSocket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    };
  }, [roomId, user, navigate]);

  const createPeerConnection = (userId: string, socketInstance: Socket, stream: MediaStream) => {
    if (peerConnectionsRef.current[userId]) {
      peerConnectionsRef.current[userId].close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketInstance.emit('ice-candidate', { target: userId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote track from:', userId);
      if (event.streams && event.streams[0]) {
        setPeers(prev => ({
          ...prev,
          [userId]: event.streams[0]
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[userId];
          return newPeers;
        });
      }
    };

    return pc;
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!localStreamRef.current.getAudioTracks()[0].enabled);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!localStreamRef.current.getVideoTracks()[0].enabled);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track for all peers
        Object.values(peerConnectionsRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        videoTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error("Error sharing screen", err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      Object.values(peerConnectionsRef.current).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }
    setIsScreenSharing(false);
  };

  const solveProblemWithAI = async () => {
    setIsSolving(true);
    setAiSolution(null);

    try {
      const videoElements = Array.from(document.querySelectorAll('video')).filter(v => v.readyState === v.HAVE_ENOUGH_DATA);
      if (videoElements.length === 0) throw new Error("No active video feeds found.");

      // Calculate total canvas size to fit all videos in a row
      const totalWidth = videoElements.reduce((sum, v) => sum + v.videoWidth, 0);
      const maxHeight = Math.max(...videoElements.map(v => v.videoHeight));

      const canvas = document.createElement('canvas');
      canvas.width = totalWidth || 1280;
      canvas.height = maxHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      let currentX = 0;
      videoElements.forEach(video => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          ctx.drawImage(video, currentX, 0, video.videoWidth, video.videoHeight);
          currentX += video.videoWidth;
        }
      });

      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'Gemini-2.5-Flash',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
            { text: "Look at these video feeds (which may include camera and screen shares). Identify any academic or technical problem shown and provide a clear, step-by-step solution. If there are multiple problems, solve the most prominent one." }
          ]
        }
      });

      setAiSolution(response.text || "No solution found.");
    } catch (error) {
      console.error("AI Solver Error:", error);
      setAiSolution("Failed to solve the problem. Please try again.");
    } finally {
      setIsSolving(false);
    }
  };

  const leaveMeet = () => {
    navigate('/');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen bg-stone-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-stone-800">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Live Meet: {roomId}</h1>
          <button 
            onClick={copyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg text-sm transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
        <button 
          onClick={solveProblemWithAI}
          disabled={isSolving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          {isSolving ? 'Solving...' : 'AI Problem Solver'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
          {/* Local Video */}
          <div className="relative bg-stone-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!isScreenSharing && 'scale-x-[-1]'}`} 
            />
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-sm backdrop-blur-sm">
              You {isScreenSharing && '(Screen)'}
            </div>
          </div>

          {/* Remote Videos */}
          {Object.entries(peers).map(([peerId, stream]) => (
            <div key={peerId} className="relative bg-stone-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
              <VideoPlayer stream={stream} />
              <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-lg text-sm backdrop-blur-sm">
                Peer
              </div>
            </div>
          ))}
        </div>

        {/* AI Solution Panel */}
        {aiSolution && (
          <div className="w-96 bg-stone-800 border-l border-stone-700 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Solution
              </h2>
              <button onClick={() => setAiSolution(null)} className="p-2 hover:bg-stone-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto prose prose-invert">
              <div className="whitespace-pre-wrap text-stone-300 text-sm leading-relaxed">
                {aiSolution}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 flex items-center justify-center gap-4 bg-stone-950">
        <button 
          onClick={toggleMute}
          className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-stone-800 hover:bg-stone-700'}`}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <button 
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-stone-800 hover:bg-stone-700'}`}
        >
          {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
        </button>
        <button 
          onClick={toggleScreenShare}
          className={`p-4 rounded-full transition-colors ${isScreenSharing ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-stone-800 hover:bg-stone-700'}`}
        >
          <MonitorUp className="w-6 h-6" />
        </button>
        <button 
          onClick={leaveMeet}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-colors ml-8"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

// Helper component to render remote video streams
function VideoPlayer({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video 
      ref={videoRef} 
      autoPlay 
      playsInline 
      className="w-full h-full object-cover" 
    />
  );
}
