import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import { Sparkles, Users, Target, LogIn } from 'lucide-react';

export default function StudySquads() {
  const { user, setAuthModalOpen } = useStore();
  const [topic, setTopic] = useState('');
  const [squads, setSquads] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSquads = async () => {
      try {
        const q = query(collection(db, 'sprintGroups'), where('members', 'array-contains', user.uid));
        const snapshot = await getDocs(q);
        setSquads(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching squads:", error);
      }
    };
    fetchSquads();
  }, [user]);

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
      setSquads([{ id: docRef.id, ...newSquad }, ...squads]);
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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Study Squads</h1>
          <p className="text-stone-500">AI-generated weekend sprint groups for intensive learning.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" /> Create a New Squad
        </h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What do you want to master this weekend? (e.g., Advanced React Hooks)"
            className="flex-1 px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            onKeyDown={(e) => e.key === 'Enter' && generateSquad()}
          />
          <button
            onClick={generateSquad}
            disabled={isGenerating || !topic.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            {isGenerating ? 'Generating...' : 'Form Squad'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            
            <div className="mb-4">
              <p className="text-sm font-medium text-stone-700 flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-emerald-600" /> Goal
              </p>
              <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100">
                {squad.goal}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-stone-700 mb-2">Weekend Sprint Plan</p>
              <div className="text-sm text-stone-600 whitespace-pre-wrap bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50">
                {squad.aiSummary}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
