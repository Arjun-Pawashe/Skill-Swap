import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Plus, X, User as UserIcon, LogIn } from 'lucide-react';

export default function Profile() {
  const { user, setAuthModalOpen } = useStore();
  const [profile, setProfile] = useState<any>(null);
  const [newMasterSkill, setNewMasterSkill] = useState('');
  const [newWantedSkill, setNewWantedSkill] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };
    fetchProfile();
  }, [user]);

  const addSkill = async (type: 'mastered' | 'wanted') => {
    if (!profile || !user) return;
    const skill = type === 'mastered' ? newMasterSkill : newWantedSkill;
    if (!skill.trim()) return;

    const field = type === 'mastered' ? 'skillsMastered' : 'skillsWanted';
    const updatedSkills = [...(profile[field] || []), skill.trim()];
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [field]: updatedSkills
      });
      setProfile({ ...profile, [field]: updatedSkills });
      if (type === 'mastered') setNewMasterSkill('');
      else setNewWantedSkill('');
    } catch (error) {
      console.error("Error adding skill", error);
    }
  };

  const removeSkill = async (type: 'mastered' | 'wanted', skillToRemove: string) => {
    if (!profile || !user) return;
    const field = type === 'mastered' ? 'skillsMastered' : 'skillsWanted';
    const updatedSkills = profile[field].filter((s: string) => s !== skillToRemove);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [field]: updatedSkills
      });
      setProfile({ ...profile, [field]: updatedSkills });
    } catch (error) {
      console.error("Error removing skill", error);
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center mt-20">
        <UserIcon className="w-16 h-16 mx-auto mb-6 text-stone-300" />
        <h2 className="text-2xl font-bold mb-4">Sign in to view your profile</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Manage your skills, bio, and knowledge equity.</p>
        <button 
          onClick={() => setAuthModalOpen(true)}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </button>
      </div>
    );
  }

  if (!profile) return <div className="p-8">Loading profile...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <img src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.name}`} alt={profile.name} className="w-24 h-24 rounded-full border-4 border-white bg-white" referrerPolicy="no-referrer" />
            <div className="bg-stone-100 px-4 py-2 rounded-xl border border-stone-200">
              <span className="text-sm font-medium text-stone-500">Knowledge Equity</span>
              <p className="text-xl font-bold text-stone-900">{profile.credits} Credits</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold">{profile.name}</h1>
          <p className="text-stone-500 mb-6">{profile.email}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Skills Mastered */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                Skills I Master
                <span className="text-xs font-normal px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Teach to earn credits</span>
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skillsMastered?.map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg flex items-center gap-2">
                    {skill}
                    <button onClick={() => removeSkill('mastered', skill)} className="hover:text-indigo-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newMasterSkill}
                  onChange={(e) => setNewMasterSkill(e.target.value)}
                  placeholder="e.g. React, Calculus" 
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && addSkill('mastered')}
                />
                <button onClick={() => addSkill('mastered')} className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"><Plus className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Skills Wanted */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                Skills I Want
                <span className="text-xs font-normal px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">Spend credits to learn</span>
              </h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {profile.skillsWanted?.map((skill: string) => (
                  <span key={skill} className="px-3 py-1.5 bg-stone-100 text-stone-700 text-sm font-medium rounded-lg flex items-center gap-2">
                    {skill}
                    <button onClick={() => removeSkill('wanted', skill)} className="hover:text-stone-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newWantedSkill}
                  onChange={(e) => setNewWantedSkill(e.target.value)}
                  placeholder="e.g. Machine Learning" 
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && addSkill('wanted')}
                />
                <button onClick={() => addSkill('wanted')} className="p-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"><Plus className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
