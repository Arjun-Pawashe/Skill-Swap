import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Video, CheckCircle, Clock, BookOpen, LogIn } from 'lucide-react';

export default function Sessions() {
  const { user, setAuthModalOpen } = useStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const navigate = useNavigate();

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
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My Sessions</h1>
      
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {sessions.length > 0 ? (
          <div className="divide-y divide-stone-200">
            {sessions.map(session => {
              const isMentor = session.mentorId === user?.uid;
              return (
                <div key={session.id} className="p-6 flex items-center justify-between hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isMentor ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {isMentor ? <BookOpen className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${isMentor ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {isMentor ? 'Teaching' : 'Learning'}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                          session.status === 'completed' ? 'bg-stone-100 text-stone-600' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg">{session.skill}</h3>
                      <p className="text-sm text-stone-500">
                        {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : 'Unscheduled'} • {session.duration} hr
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {session.status === 'pending' && isMentor && (
                      <>
                        <button 
                          onClick={() => updateSessionStatus(session.id, 'scheduled')}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => updateSessionStatus(session.id, 'cancelled')}
                          className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {session.status === 'pending' && !isMentor && (
                      <span className="px-4 py-2 text-stone-500 text-sm font-medium">Waiting for mentor...</span>
                    )}
                    {session.status === 'scheduled' && (
                      <>
                        <button 
                          onClick={() => handleJoin(session.id)}
                          className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                        >
                          <Video className="w-4 h-4" /> Workspace
                        </button>
                        {isMentor && (
                          <button 
                            onClick={() => markCompleted(session.id)}
                            className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> Complete
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
          <div className="p-12 text-center text-stone-500">
            <p>No sessions found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
