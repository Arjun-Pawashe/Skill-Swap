import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Video, CheckCircle, Clock, BookOpen, LogIn, Radio, Users } from 'lucide-react';

export default function Sessions() {
  const { user, setAuthModalOpen } = useStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLiveSessions = async () => {
      try {
        const q = query(collection(db, 'sessions'), where('isLive', '==', true));
        const snapshot = await getDocs(q);
        setLiveSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching live sessions:", error);
      }
    };
    fetchLiveSessions();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      try {
        const mentorSessions = await getDocs(query(collection(db, 'sessions'), where('mentorId', '==', user.uid)));
        const learnerSessions = await getDocs(query(collection(db, 'sessions'), where('learnerId', '==', user.uid)));
        
        const combined = [...mentorSessions.docs, ...learnerSessions.docs].map(d => ({ id: d.id, ...d.data() } as any));
        setSessions(combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (error) {
        console.error("Error fetching sessions:", error);
      }
    };
    fetchSessions();
  }, [user]);

  const handleJoin = (sessionId: string) => {
    navigate(`/workspace/${sessionId}`);
  };

  const toggleLive = async (sessionId: string, currentLiveStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { isLive: !currentLiveStatus });
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, isLive: !currentLiveStatus } : s));
      
      // Update liveSessions list
      if (!currentLiveStatus) {
        const session = sessions.find(s => s.id === sessionId);
        setLiveSessions(prev => [...prev, { ...session, isLive: true }]);
      } else {
        setLiveSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error("Error toggling live status:", error);
    }
  };

  const updateSessionStatus = async (sessionId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { status: newStatus });
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: newStatus } : s));
    } catch (error) {
      console.error(`Error updating session to ${newStatus}:`, error);
    }
  };

  const markCompleted = async (sessionId: string) => {
    const proof = prompt("Enter a URL for the Proof of Work (optional):");
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { 
        status: 'completed',
        proofOfWork: proof || ''
      });
      setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'completed', proofOfWork: proof || '' } : s));
      // In a real app, we would also transfer credits here securely via a Cloud Function or secure rule.
    } catch (error) {
      console.error("Error completing session:", error);
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center mt-20">
        <Clock className="w-16 h-16 mx-auto mb-6 text-stone-300" />
        <h2 className="text-2xl font-bold mb-4">Sign in to view your sessions</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Keep track of your upcoming and past learning sessions with peers.</p>
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sessions</h1>
      </div>

      {/* Live Now Section */}
      {liveSessions.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="text-lg md:text-xl font-bold text-stone-900">Live Now</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {liveSessions.map(session => (
              <div key={session.id} className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3">
                  <span className="bg-red-500 text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">Live</span>
                </div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-base md:text-lg truncate">{session.skill}</h3>
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Open Session
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleJoin(session.id)}
                    className="w-full py-2.5 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> Open Workspace
                  </button>
                  <button 
                    onClick={() => navigate(`/meet/${session.id}`)}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Join Video Meet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <h2 className="text-lg md:text-xl font-bold mb-6">My Sessions</h2>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {sessions.length > 0 ? (
          <div className="divide-y divide-stone-200">
            {sessions.map(session => {
              const isMentor = session.mentorId === user?.uid;
              return (
                <div key={session.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 ${isMentor ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isMentor ? <BookOpen className="w-5 h-5 md:w-6 md:h-6" /> : <Clock className="w-5 h-5 md:w-6 md:h-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isMentor ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isMentor ? 'Teaching' : 'Learning'}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                          session.status === 'completed' ? 'bg-stone-100 text-stone-600' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {session.status}
                        </span>
                        {session.isLive && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100">
                            Live
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base md:text-lg truncate">{session.skill}</h3>
                      <p className="text-[10px] md:text-sm text-stone-500">
                        {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : 'Unscheduled'} • {session.duration} hr
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {session.status === 'pending' && isMentor && (
                      <>
                        <button 
                          onClick={() => updateSessionStatus(session.id, 'scheduled')}
                          className="px-3 md:px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => updateSessionStatus(session.id, 'cancelled')}
                          className="px-3 md:px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs md:text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {session.status === 'pending' && !isMentor && (
                      <span className="px-4 py-2 text-stone-500 text-xs md:text-sm font-medium">Waiting for mentor...</span>
                    )}
                    {session.status === 'scheduled' && (
                      <>
                        <button 
                          onClick={() => toggleLive(session.id, !!session.isLive)}
                          className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 ${
                            session.isLive 
                              ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                              : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                          }`}
                        >
                          <Radio className={`w-3 h-3 md:w-4 md:h-4 ${session.isLive ? 'animate-pulse' : ''}`} />
                          {session.isLive ? 'End' : 'Go Live'}
                        </button>
                        <button 
                          onClick={() => handleJoin(session.id)}
                          className="px-3 md:px-4 py-2 bg-stone-900 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                        >
                          <Video className="w-3 h-3 md:w-4 md:h-4" /> Workspace
                        </button>
                        {isMentor && (
                          <button 
                            onClick={() => markCompleted(session.id)}
                            className="px-3 md:px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs md:text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> Complete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 md:p-12 text-center text-stone-500">
            <p className="text-sm md:text-base">No sessions found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
