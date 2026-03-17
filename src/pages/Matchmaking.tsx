import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { Search, ArrowRight, Users, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Matchmaking() {
  const { user, setAuthModalOpen } = useStore();
  const [peers, setPeers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const fetchPeers = async () => {
      try {
        const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
        const snapshot = await getDocs(q);
        const peersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPeers(peersData);
      } catch (error) {
        console.error("Error fetching peers:", error);
      }
    };
    fetchPeers();
  }, [user]);

  const requestSession = async (peerId: string, skill: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await addDoc(collection(db, 'sessions'), {
        mentorId: peerId,
        learnerId: user.uid,
        skill: skill,
        status: 'pending',
        duration: 1,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        createdAt: new Date().toISOString()
      });
      alert('Session requested successfully!');
      navigate('/sessions');
    } catch (error) {
      console.error("Error requesting session:", error);
      alert('Failed to request session.');
    }
  };

  const requestGhostTeaching = async (peerId: string, skill: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const videoUrl = prompt("Enter the URL to your recorded breakdown (Ghost-Teaching):");
    if (!videoUrl) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: peerId,
        content: `Ghost-Teaching Request for ${skill}: ${videoUrl}`,
        type: 'ghost-teaching-video',
        timestamp: new Date().toISOString()
      });
      alert('Ghost-Teaching request sent successfully!');
    } catch (error) {
      console.error("Error sending ghost teaching request:", error);
      alert('Failed to send request.');
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center mt-20">
        <Users className="w-16 h-16 mx-auto mb-6 text-stone-300" />
        <h2 className="text-2xl font-bold mb-4">Sign in to find peers</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Join the community to discover students who want to learn what you know, and know what you want to learn.</p>
        <button 
          onClick={() => setAuthModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </button>
      </div>
    );
  }

  const filteredPeers = peers.filter(peer => 
    peer.skillsMastered?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
    peer.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Find Peers</h1>
          <p className="text-stone-500 text-sm md:text-base">Exchange skills and build your knowledge equity.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input 
            type="text" 
            placeholder="Search skills or names..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredPeers.map(peer => (
          <div key={peer.id} className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4 mb-4">
              <img src={peer.photoURL || `https://ui-avatars.com/api/?name=${peer.name}`} alt={peer.name} className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
              <div>
                <h3 className="font-bold text-lg">{peer.name}</h3>
                <p className="text-sm text-stone-500">{peer.credits} Credits</p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Can Teach</p>
              <div className="flex flex-wrap gap-2">
                {peer.skillsMastered?.map((skill: string) => (
                  <div key={skill} className="flex items-center gap-1">
                    <button 
                      onClick={() => requestSession(peer.uid, skill)}
                      title={`Request live session for ${skill}`}
                      className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
                    >
                      {skill}
                    </button>
                    <button 
                      onClick={() => requestGhostTeaching(peer.uid, skill)}
                      title={`Request Ghost-Teaching for ${skill}`}
                      className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded-md transition-colors cursor-pointer"
                    >
                      👻
                    </button>
                  </div>
                ))}
                {(!peer.skillsMastered || peer.skillsMastered.length === 0) && (
                  <span className="text-sm text-stone-400 italic">No skills listed</span>
                )}
              </div>
            </div>

            <div className="mb-2 md:mb-6">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Wants to Learn</p>
              <div className="flex flex-wrap gap-2">
                {peer.skillsWanted?.map((skill: string) => (
                  <span key={skill} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs font-medium rounded-md">
                    {skill}
                  </span>
                ))}
                {(!peer.skillsWanted || peer.skillsWanted.length === 0) && (
                  <span className="text-sm text-stone-400 italic">No skills listed</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
