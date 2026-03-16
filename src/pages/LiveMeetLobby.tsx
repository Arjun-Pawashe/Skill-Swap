import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Video, Users, Sparkles, LogIn } from 'lucide-react';

export default function LiveMeetLobby() {
  const { user, setAuthModalOpen } = useStore();
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleCreateMeet = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9);
    navigate(`/meet/${newRoomId}`);
  };

  const handleJoinMeet = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/meet/${roomId.trim()}`);
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center mt-20">
        <Video className="w-16 h-16 mx-auto mb-6 text-stone-300" />
        <h2 className="text-2xl font-bold mb-4">Sign in to join Live Meets</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Join Google Meet style online meetings to share problems and use our AI Problem Solver.</p>
        <button 
          onClick={() => setAuthModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="text-center mb-12 mt-10">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Live Meets</h1>
        <p className="text-xl text-stone-500 max-w-2xl mx-auto">
          Connect with peers live, share your screen, and let the AI Problem Solver help you when you get stuck.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Create Meet */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Video className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">New Meeting</h2>
          <p className="text-stone-500 mb-8">
            Start a new live meeting and invite others to join you.
          </p>
          <button 
            onClick={handleCreateMeet}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Start a Meeting
          </button>
        </div>

        {/* Join Meet */}
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Join Meeting</h2>
          <p className="text-stone-500 mb-8">
            Enter a meeting code to join an existing session.
          </p>
          <form onSubmit={handleJoinMeet} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter meeting code" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 px-4 py-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-center font-mono text-lg"
            />
            <button 
              type="submit"
              disabled={!roomId.trim()}
              className="px-8 py-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-xl font-bold transition-colors"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="mt-12 bg-indigo-50 p-6 rounded-2xl border border-indigo-100 flex items-start gap-4">
        <Sparkles className="w-8 h-8 text-indigo-600 shrink-0" />
        <div>
          <h3 className="font-bold text-indigo-900 mb-1">AI Problem Solver Included</h3>
          <p className="text-indigo-700 text-sm">
            Inside every Live Meet, you can use the AI Problem Solver. Just share your screen or point your camera at a problem, click the button, and the AI will analyze the video feed to provide a step-by-step solution instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
