import { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { auth, logOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookOpen, Users, Calendar, User as UserIcon, LogOut, Sparkles, MessageSquare, LogIn, Video, Bell, Menu, X as CloseIcon } from 'lucide-react';
import AuthModal from './AuthModal';
import { useState } from 'react';

export default function Layout() {
  const { user, isAuthReady, setUser, setAuthReady, isAuthModalOpen, setAuthModalOpen, unreadMessagesCount, setUnreadMessagesCount } = useStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessagesCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user, setUnreadMessagesCount]);

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
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" />
          <span className="text-lg font-bold tracking-tight">SkillSwap</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <CloseIcon className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar (Desktop & Mobile Overlay) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-stone-200 flex flex-col transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-bold tracking-tight">SkillSwap</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 md:py-0 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  {item.label}
                </div>
                {item.path === '/messages' && unreadMessagesCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {unreadMessagesCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 bg-white">
          {user ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full bg-stone-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.displayName || user.email?.split('@')[0]}</p>
                  <p className="text-xs text-stone-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logOut();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setAuthModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-2 py-2 flex justify-around items-center z-40">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative ${
                isActive ? 'text-indigo-600' : 'text-stone-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              {item.path === '/messages' && unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full min-w-[14px] text-center">
                  {unreadMessagesCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
}
