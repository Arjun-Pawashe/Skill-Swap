import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Clock, Star, Award, BookOpen, Users, Sparkles, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, setAuthModalOpen } = useStore();
  const [stats, setStats] = useState({ credits: 0, sessionsCompleted: 0, rating: 0 });
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch user stats
        const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          setStats(prev => ({ ...prev, credits: userData.credits || 0 }));
        }

        // Fetch upcoming sessions
        const mentorSessions = await getDocs(query(collection(db, 'sessions'), where('mentorId', '==', user.uid), where('status', '==', 'scheduled')));
        const learnerSessions = await getDocs(query(collection(db, 'sessions'), where('learnerId', '==', user.uid), where('status', '==', 'scheduled')));
        
        const combined = [...mentorSessions.docs, ...learnerSessions.docs].map(d => ({ id: d.id, ...d.data() }));
        setUpcomingSessions(combined);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, [user]);

  if (!user) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-indigo-600 rounded-3xl p-12 text-center text-white mb-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <BookOpen className="w-16 h-16 mx-auto mb-6 text-indigo-200" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Welcome to SkillSwap</h1>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            The peer-to-peer knowledge exchange platform. Trade your skills, learn from others, and build your knowledge equity.
          </p>
          <button 
            onClick={() => setAuthModalOpen(true)}
            className="px-8 py-4 bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold text-lg transition-colors shadow-lg flex items-center gap-2 mx-auto"
          >
            <LogIn className="w-5 h-5" />
            Sign In to Get Started
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-3">Find Peers</h3>
            <p className="text-stone-500">Match with students who want to learn what you know, and know what you want to learn.</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-3">Time-Bank Credits</h3>
            <p className="text-stone-500">Earn credits by teaching others. Spend them to get 1-on-1 tutoring from experts.</p>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-3">Study Squads</h3>
            <p className="text-stone-500">Use AI to generate weekend sprint curriculums and form temporary micro-communities.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 tracking-tight">Welcome back, {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0]}</h1>
      
      {/* Knowledge Equity Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-stone-500 font-medium">Time-Bank Credits</p>
            <p className="text-xl md:text-2xl font-bold">{stats.credits} hrs</p>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-stone-500 font-medium">Sessions Taught</p>
            <p className="text-xl md:text-2xl font-bold">{stats.sessionsCompleted}</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-stone-500 font-medium">Average Rating</p>
            <p className="text-xl md:text-2xl font-bold">{stats.rating.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <h2 className="text-lg md:text-xl font-bold mb-4">Upcoming Sessions</h2>
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {upcomingSessions.length > 0 ? (
          <div className="divide-y divide-stone-200">
            {upcomingSessions.map(session => (
              <div key={session.id} className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-stone-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm md:text-base">{session.skill}</p>
                    <p className="text-xs md:text-sm text-stone-500">
                      {new Date(session.scheduledAt).toLocaleString()} • {session.duration} hr
                    </p>
                  </div>
                </div>
                <Link to={`/workspace/${session.id}`} className="w-full sm:w-auto text-center px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
                  Join Workspace
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 md:p-12 text-center text-stone-500">
            <Calendar className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-stone-300" />
            <p className="text-sm md:text-base">No upcoming sessions scheduled.</p>
            <Link to="/matchmaking" className="inline-block mt-4 px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg transition-colors">
              Find a Peer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Dummy Calendar icon for empty state
function Calendar(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}
