import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { MessageSquare, Video, LogIn, Send } from 'lucide-react';

export default function Messages() {
  const { user, setAuthModalOpen } = useStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!user) return;
    const fetchMessages = async () => {
      try {
        const q = query(
          collection(db, 'messages'),
          where('receiverId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setMessages(msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };
    fetchMessages();
  }, [user]);

  const handleReply = async (receiverId: string, messageId: string) => {
    if (!user || !replyText[messageId]?.trim()) return;
    
    try {
      await addDoc(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId: receiverId,
        content: replyText[messageId],
        type: 'text',
        timestamp: new Date().toISOString()
      });
      setReplyText({ ...replyText, [messageId]: '' });
      alert('Reply sent!');
    } catch (error) {
      console.error("Error sending reply:", error);
      alert('Failed to send reply.');
    }
  };

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center mt-20">
        <MessageSquare className="w-16 h-16 mx-auto mb-6 text-stone-300" />
        <h2 className="text-2xl font-bold mb-4">Sign in to view messages</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">Check your ghost-teaching requests and session updates.</p>
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
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 md:mb-8">Messages & Requests</h1>
      
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {messages.length > 0 ? (
          <div className="divide-y divide-stone-200">
            {messages.map(msg => (
              <div key={msg.id} className="p-4 md:p-6 flex items-start gap-3 md:gap-4 hover:bg-stone-50 transition-colors">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${msg.type === 'ghost-teaching-video' ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {msg.type === 'ghost-teaching-video' ? <Video className="w-4 h-4 md:w-5 md:h-5" /> : <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                    <span className="font-bold text-stone-900 truncate">User {msg.senderId.substring(0, 5)}</span>
                    <span className="text-[10px] md:text-xs text-stone-500">{new Date(msg.timestamp).toLocaleString()}</span>
                    {msg.type === 'ghost-teaching-video' && (
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md">
                        Ghost-Teaching
                      </span>
                    )}
                  </div>
                  <p className="text-sm md:text-base text-stone-700 mb-4 break-words">{msg.content}</p>
                  
                  <div className="flex gap-2 mt-2">
                    <input 
                      type="text" 
                      placeholder="Type a reply..."
                      value={replyText[msg.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [msg.id]: e.target.value })}
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(msg.senderId, msg.id)}
                    />
                    <button 
                      onClick={() => handleReply(msg.senderId, msg.id)}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      title="Send Reply"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 md:p-12 text-center text-stone-500">
            <MessageSquare className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-stone-300" />
            <p className="text-sm md:text-base">No messages yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
