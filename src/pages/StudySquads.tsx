import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Users, Target, LogIn, Search } from 'lucide-react';

export default function StudySquads() {
  const { user, setAuthModalOpen } = useStore();
  const [topic, setTopic] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [squads, setSquads] = useState<any[]>([]);
  const [allSquads, setAllSquads] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchAllSquads = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sprintGroups'));
        const squadsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllSquads(squadsData);
      } catch (error) {
        console.error("Error fetching all squads:", error);
      }
    };
    fetchAllSquads();
  }, []);

  useEffect(() => {
    if (!user) {
      setSquads([]);
      return;
    }
    const mySquads = allSquads.filter(s => s.members?.includes(user.uid));
    setSquads(mySquads);
  }, [user, allSquads]);

  const joinSquad = async (squadId: string) => {
    if (!user) return;
    try {
      const squadRef = doc(db, 'sprintGroups', squadId);
      await updateDoc(squadRef, {
        members: arrayUnion(user.uid)
      });
      
      setAllSquads(prev => prev.map(s => 
        s.id === squadId ? { ...s, members: [...(s.members || []), user.uid] } : s
      ));
    } catch (error) {
      console.error("Error joining squad:", error);
    }
  };

  const filteredSquads = allSquads.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.goal.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateSquad = async () => {
    if (!topic.trim() || !user) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Create a weekend sprint group curriculum for students learning about: "${topic}". Provide a JSON response with the following keys: "name" (a catchy name for the squad), "goal" (a 1-sentence goal), and "aiSummary" (a 3-step weekend sprint plan).`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      const newSquad = {
        name: data.name,
        goal: data.goal,
        aiSummary: data.aiSummary,
        members: [user.uid], // In a real app, we'd match other users here
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'sprintGroups'), newSquad);
      const squadWithId = { id: docRef.id, ...newSquad };
      setAllSquads([squadWithId, ...allSquads]);
      setTopic('');
    } catch (error) {
      console.error("Error generating squad:", error);
      alert("Failed to generate squad. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center mt-20">
        <Sparkles className="w-16 h-16 mx-auto mb-6 text-stone-300" />
        <h2 className="text-2xl font-bold mb-4">Sign in to join Study Squads</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Use AI to generate weekend sprint curriculums and form temporary micro-communities.</p>
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">Study Squads</h1>
          <p className="text-stone-500 text-sm md:text-base">AI-generated weekend sprint groups for intensive learning.</p>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" /> Create a New Squad
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to master this weekend?"
            className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
            onKeyDown={(e) => e.key === 'Enter' && generateSquad()}
          />
          <button
            onClick={generateSquad}
            disabled={isGenerating || !topic.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? 'Generating...' : 'Form Squad'}
          </button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Explore Squads</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search squads..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {filteredSquads.map(squad => {
            const isMember = user && squad.members?.includes(user.uid);
            return (
              <div key={squad.id} className="bg-white p-5 md:p-6 rounded-2xl border border-stone-200 shadow-sm flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base md:text-lg leading-tight">{squad.name}</h3>
                      <p className="text-xs text-stone-500">{squad.members?.length || 0} Members</p>
                    </div>
                  </div>
                  {!isMember && (
                    <button
                      onClick={() => joinSquad(squad.id)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors shrink-0"
                    >
                      Join
                    </button>
                  )}
                  {isMember && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">
                      Member
                    </span>
                  )}
                </div>
                
                <div className="mb-4 flex-1">
                  <p className="text-xs font-medium text-stone-700 flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-emerald-600" /> Goal
                  </p>
                  <p className="text-xs md:text-sm text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                    {squad.goal}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium text-stone-700 mb-2">Weekend Sprint Plan</p>
                  <div className="text-xs md:text-sm text-stone-600 whitespace-pre-wrap bg-indigo-50/50 p-3 md:p-4 rounded-lg border border-indigo-100/50">
                    {squad.aiSummary}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredSquads.length === 0 && (
            <div className="col-span-full py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
              <Users className="w-12 h-12 mx-auto mb-4 text-stone-300" />
              <p className="text-stone-500">No squads found matching your search.</p>
            </div>
          )}
        </div>
      </div>

      {user && squads.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">My Squads</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75">
            {squads.map(squad => (
              <div key={squad.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{squad.name}</h3>
                    <p className="text-sm text-stone-500">{squad.members.length} Members</p>
                  </div>
                </div>
                <p className="text-sm text-stone-600">{squad.goal}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
