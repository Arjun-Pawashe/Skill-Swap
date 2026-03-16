import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { auth, logOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, Users, Calendar, User as UserIcon, LogOut, Sparkles, MessageSquare, LogIn, Video } from 'lucide-react';
import AuthModal from './AuthModal';

export default function Layout() {
  const { user, isAuthReady, setUser, setAuthReady, isAuthModalOpen, setAuthModalOpen } = useStore();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Check if user exists in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            // Create new user profile
            await setDoc(userRef, {
              uid: currentUser.uid,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonymous',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              bio: '',
              skillsMastered: [],
              skillsWanted: [],
              credits: 5, // Starting bonus
              role: 'student',
              createdAt: new Date().toISOString() // Use ISO string instead of serverTimestamp to avoid any rule issues
            });
          }
        } catch (error) {
          console.error("Error fetching or creating user document:", error);
        }
      }
      setUser(currentUser);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-900">Loading...</div>;
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BookOpen },
    { path: '/matchmaking', label: 'Find Peers', icon: Users },
    { path: '/sessions', label: 'Sessions', icon: Calendar },
    { path: '/squads', label: 'Study Squads', icon: Sparkles },
    { path: '/messages', label: 'Messages', icon: MessageSquare },
    { path: '/meet', label: 'Live Meets', icon: Video },
    { path: '/profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-bold tracking-tight">SkillSwap</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full bg-stone-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName || user.email?.split('@')[0]}</p>
                  <p className="text-xs text-stone-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={logOut}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
