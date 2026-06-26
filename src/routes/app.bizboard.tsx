import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ref, onValue, push, set, get } from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";
import { useAppState } from "@/hooks/useAppState";
import { 
  Heart, X, Search, Sparkles, Plus, Navigation, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/bizboard")({
  component: BizBoardPage,
});

const CATEGORIES = ["All", "Rice", "Textile", "Mobile Accessories", "Bakery", "E-commerce", "Real Estate", "Dairy", "IT Services"];
const COLORS = ["#FFD966", "#FFB3C6", "#B5EAD7", "#AED6F1", "#F0E6FF"];

function BizBoardPage() {
  const { business, isLoggedIn } = useAppState();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal state
  const [newNoteCategory, setNewNoteCategory] = useState("Rice");
  const [newNoteColor, setNewNoteColor] = useState(COLORS[0]);
  const [newNoteContent, setNewNoteContent] = useState("");

  useEffect(() => {
    // Add Google Font for Caveat
    if (!document.getElementById("google-font-caveat")) {
      const link = document.createElement("link");
      link.id = "google-font-caveat";
      link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&display=swap";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const notesRef = ref(database, RTDB.communityPosts);
    const unsubscribe = onValue(notesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loadedNotes = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter((n) => n.type === "sticky_note");
        setNotes(loadedNotes.sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setNotes([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation(); // Prevent card click
    if (!isLoggedIn || !business?.uid) return;

    const likeRef = ref(database, RTDB.communityPostLikes(note.id, business.uid));
    const likeSnap = await get(likeRef);
    
    const noteLikesRef = ref(database, `${RTDB.communityPost(note.id)}/likesCount`);
    const noteLikesSnap = await get(noteLikesRef);
    const currentLikes = noteLikesSnap.exists() ? noteLikesSnap.val() : 0;

    if (likeSnap.exists()) {
      // Unlike
      await set(likeRef, null);
      await set(noteLikesRef, Math.max(0, currentLikes - 1));
    } else {
      // Like
      await set(likeRef, true);
      await set(noteLikesRef, currentLikes + 1);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || !business?.uid) {
      alert("Please log in as a business to post.");
      return;
    }
    
    if (newNoteContent.trim() === "") return;

    const newRef = push(ref(database, RTDB.communityPosts));
    await set(newRef, {
      id: newRef.key,
      type: "sticky_note",
      category: newNoteCategory,
      color: newNoteColor,
      content: newNoteContent,
      author: business.name || "Anonymous",
      authorId: business.uid,
      businessId: business.uid,
      score: business.score || 65,
      likes: 0,
      views: 0,
      createdAt: Date.now()
    });

    setIsModalOpen(false);
    setNewNoteContent("");
  };

  const filteredNotes = notes.filter(note => {
    const matchesCategory = activeCategory === "All" || note.category === activeCategory;
    const matchesSearch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FFF8E7] text-slate-800 font-display pb-20">
      {/* Navbar */}
      <nav className="w-full bg-white/50 backdrop-blur-md border-b border-[#F0E6FF] sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="font-display font-extrabold text-xl tracking-tight flex items-center gap-2 text-slate-900">
          <Sparkles className="h-5 w-5 text-amber-500" />
          BizBoard
        </div>
        <div className="flex gap-6 text-sm font-bold text-slate-600">
          <Link to="/" className="hover:text-amber-600 transition">Home</Link>
          <Link to="/app/community" className="hover:text-amber-600 transition">Community</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mt-16 px-6">
        <h1 className="font-display text-5xl font-black text-slate-900 tracking-tight">Business Community Board</h1>
        <p className="mt-4 text-lg text-slate-600 font-medium leading-relaxed">
          Share what's working in your industry. Stick a note, like the best ideas, and ask founders for real help.
        </p>
      </div>

      {/* Main Section */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 mt-16 space-y-8">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-amber-900/10 pb-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span className="text-amber-500 text-3xl leading-none">□</span> Insight Board
            </h2>
            <p className="text-sm font-bold text-slate-500">Pick a business, drop your insight as a sticky note.</p>
          </div>
          
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-6 rounded-2xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Add Sticky Note
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col xl:flex-row justify-between gap-6 items-center">
          <div className="flex gap-2 flex-wrap max-w-3xl">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  activeCategory === cat 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:bg-amber-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex w-full xl:w-[500px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              placeholder="What do you need? e.g. 'I want to start rice export'"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-32 py-4 rounded-full border border-slate-200 shadow-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 text-sm font-medium"
            />
            <Button className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-500 hover:bg-amber-600 text-white rounded-full font-bold px-4 flex items-center gap-1.5 h-10">
              <Sparkles className="h-3.5 w-3.5" /> AI Match
            </Button>
          </div>
        </div>

        {/* Sticky Notes Grid Area */}
        <div 
          className="w-full min-h-[600px] rounded-[3rem] p-8 md:p-12 border-4 border-white shadow-xl relative overflow-hidden"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, #FFF8E7, #FFF8E7 10px, rgba(217,119,6,0.03) 10px, rgba(217,119,6,0.03) 20px)`
          }}
        >
          <div className="flex flex-wrap gap-8 justify-center animate-in fade-in zoom-in duration-500">
            {filteredNotes.map((note, index) => {
              // Deterministic random rotation between -2 and +2 degrees
              const rotation = (index % 5 - 2) * 1.5 + "deg";
              const delay = `${index * 100}ms`;

              return (
                <div 
                  key={note.id}
                  onClick={() => navigate({ to: `/app/businessprofile/${note.businessId}` })}
                  className="w-[280px] min-h-[280px] p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:scale-105 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 group relative"
                  style={{
                    backgroundColor: note.color || '#FFD966',
                    boxShadow: '3px 3px 8px rgba(0,0,0,0.15)',
                    transform: `rotate(${rotation})`,
                    animationDelay: delay,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Fold effect top right */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-black/5 opacity-50 rounded-bl-xl mix-blend-multiply" />

                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black tracking-widest uppercase bg-white/40 px-2 py-1 rounded">
                      {note.category}
                    </span>
                    <div className="flex -space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-200 border border-white" />
                      <div className="w-5 h-5 rounded-full bg-slate-300 border border-white" />
                      <div className="w-5 h-5 rounded-full bg-slate-400 border border-white flex items-center justify-center text-[7px] text-white font-bold">+12</div>
                    </div>
                  </div>

                  <div 
                    className="flex-1 text-2xl leading-tight text-slate-800 mb-6"
                    style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}
                  >
                    {note.content}
                  </div>

                  <div className="border-t border-black/10 pt-4 flex flex-col gap-2 mt-auto">
                    <div className="text-sm font-bold text-slate-800">
                      — {note.author}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black bg-black/5 px-2 py-1 rounded text-slate-700">
                        R: {note.score}
                      </span>
                      <button 
                        onClick={(e) => handleLike(e, note)}
                        className="flex items-center gap-1.5 text-slate-700 hover:text-red-500 transition-colors p-1 group/btn"
                      >
                        <Heart className="h-4 w-4 group-hover/btn:fill-red-500 group-hover/btn:animate-ping duration-300" />
                        <span className="text-xs font-bold">{note.likes || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredNotes.length === 0 && (
              <div className="w-full py-32 text-center text-slate-400 font-bold">
                No sticky notes found for this category. Be the first to stick one!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="font-display text-xl font-bold text-slate-900">Post a Sticky Note</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddNote} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Category</label>
                <select 
                  value={newNoteCategory}
                  onChange={e => setNewNoteCategory(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                >
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-slate-500">Note Color</label>
                <div className="flex gap-3">
                  {COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewNoteColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform ${newNoteColor === color ? 'scale-110 ring-4 ring-slate-200 ring-offset-2 shadow-inner' : 'hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold uppercase text-slate-500">Insight</label>
                  <span className="text-[10px] font-bold text-slate-400">{newNoteContent.length} / 200</span>
                </div>
                <textarea
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value.slice(0, 200))}
                  placeholder="Share your business insight..."
                  className="w-full rounded-xl border border-slate-200 p-4 text-lg outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[120px] resize-none"
                  style={{ backgroundColor: newNoteColor, fontFamily: "'Caveat', cursive", fontWeight: 600 }}
                  required
                />
              </div>

              <Button type="submit" className="w-full py-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-lg shadow-lg shadow-amber-500/20">
                Stick It! 📌
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
