import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ref, onValue, push, set, get } from "firebase/database";
import { database } from "@/firebase";
import { RTDB } from "@/lib/rtdbPaths";
import { useAppState } from "@/hooks/useAppState";
import { 
  Bot, Send, Instagram, Facebook, Twitter, Linkedin, Star, Heart, MapPin, ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/businessprofile/$businessId")({
  component: BusinessProfilePage,
});

function BusinessProfilePage() {
  const { businessId } = Route.useParams();
  const { isLoggedIn, business: loggedInUser } = useAppState();
  
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "reviews" | "about">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  // Review form
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // AI Chat
  const [chatInput, setChatInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;

    // Fetch profile
    const profileRef = ref(database, RTDB.userBusiness(businessId));
    onValue(profileRef, snap => {
      if (snap.exists()) setProfile(snap.val());
    });

    // Fetch posts
    const notesRef = ref(database, RTDB.communityPosts);
    onValue(notesRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const bizPosts = Object.keys(data)
          .map(k => ({ id: k, ...data[k] }))
          .filter(p => p.type === "sticky_note" && p.businessId === businessId)
          .sort((a, b) => b.createdAt - a.createdAt);
        setPosts(bizPosts);
      }
    });

    // Fetch reviews
    const reviewsRef = ref(database, `${RTDB.users(businessId)}/reviews`);
    onValue(reviewsRef, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const bizReviews = Object.keys(data)
          .map(k => ({ id: k, ...data[k] }))
          .sort((a, b) => b.createdAt - a.createdAt);
        setReviews(bizReviews);
      }
    });
  }, [businessId]);

  const handleLike = async (note: any) => {
    if (!isLoggedIn || !loggedInUser?.uid) return;
    const likeRef = ref(database, RTDB.communityPostLikes(note.id, loggedInUser.uid));
    const likeSnap = await get(likeRef);
    const noteLikesRef = ref(database, `${RTDB.communityPost(note.id)}/likesCount`);
    const noteLikesSnap = await get(noteLikesRef);
    const currentLikes = noteLikesSnap.exists() ? noteLikesSnap.val() : 0;

    if (likeSnap.exists()) {
      await set(likeRef, null);
      await set(noteLikesRef, Math.max(0, currentLikes - 1));
    } else {
      await set(likeRef, true);
      await set(noteLikesRef, currentLikes + 1);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName || !reviewComment) return;

    const newRef = push(ref(database, `${RTDB.users(businessId)}/reviews`));
    await set(newRef, {
      businessId,
      reviewerName: reviewName,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: Date.now()
    });

    setReviewName("");
    setReviewComment("");
    setReviewRating(5);
  };

  const handleAskAI = async (queryText: string) => {
    if (!queryText.trim()) return;
    setChatInput("");
    setIsAiLoading(true);
    setAiResponse("");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system: "You are a Pakistani business consultant helping small business owners grow their businesses. Give practical, actionable advice specific to Pakistani markets.",
          messages: [{ role: "user", content: queryText }]
        })
      });
      const data = await res.json();
      if (data.content && data.content[0]) {
        setAiResponse(data.content[0].text);
      } else {
        setAiResponse("I could not generate an answer at this time.");
      }
    } catch (err) {
      setAiResponse("Error connecting to AI Consultant. Please try again later.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!profile) return <div className="p-12 text-center text-slate-500">Loading Profile...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4 md:p-8">
      <div className="w-full max-w-[1200px] flex flex-col lg:flex-row gap-8">
        
        {/* Left Column (70%) */}
        <div className="flex-1 space-y-6">
          
          {/* Cover & Header */}
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200">
            <div className="h-48 bg-gradient-to-r from-amber-400 to-amber-600 relative">
              <div className="absolute -bottom-12 left-8 w-24 h-24 rounded-full border-4 border-white bg-slate-900 flex items-center justify-center text-3xl font-display font-bold text-white shadow-md">
                {profile.name?.[0]?.toUpperCase() || "B"}
              </div>
            </div>
            <div className="pt-16 pb-8 px-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-display font-black text-slate-900">{profile.name}</h1>
                  <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                    {profile.category || "Business"}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600 max-w-2xl">{profile.about || "No bio provided."}</p>
              
              <div className="flex gap-6 mt-6 border-t border-slate-100 pt-6">
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{posts.length}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">
                    {posts.reduce((sum, p) => sum + (p.likes || 0), 0)}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Likes</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-amber-600">{profile.score || 65}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reputation Score</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900">{reviews.length}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Reviews</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-slate-200">
            {["posts", "reviews", "about"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-4 text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                  ? "text-amber-600 border-b-2 border-amber-600" 
                  : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
            
            {/* POSTS TAB */}
            {activeTab === "posts" && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Sticky Notes by {profile.name}</h3>
                {posts.length === 0 ? (
                  <div className="text-sm text-slate-500">No posts yet.</div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {posts.map(post => (
                      <div key={post.id} className="p-5 rounded-2xl border border-slate-100 flex flex-col" style={{ backgroundColor: post.color || '#FFF8E7' }}>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/50 px-2 py-1 rounded w-max mb-3">
                          {post.category}
                        </span>
                        <div className="text-lg font-medium text-slate-800 flex-1 leading-snug" style={{ fontFamily: "'Caveat', cursive", fontWeight: 600 }}>
                          {post.content}
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-black/5">
                          <span className="text-xs text-slate-500 font-medium">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                          <button onClick={() => handleLike(post)} className="flex items-center gap-1 text-slate-600 hover:text-red-500">
                            <Heart className="h-4 w-4" /> <span className="text-xs font-bold">{post.likes || 0}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === "reviews" && (
              <div className="space-y-8">
                {isLoggedIn && (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Leave a Review</h3>
                    <form onSubmit={handleAddReview} className="space-y-4">
                      <div className="flex gap-4">
                        <input 
                          type="text" placeholder="Your Name" 
                          value={reviewName} onChange={e => setReviewName(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500" required
                        />
                        <div className="flex items-center gap-1 bg-white px-4 border border-slate-200 rounded-xl">
                          {[1,2,3,4,5].map(star => (
                            <Star 
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className={`h-5 w-5 cursor-pointer ${star <= reviewRating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <textarea 
                        placeholder="Write your review here..."
                        value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-amber-500 min-h-[100px]" required
                      />
                      <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl px-6">
                        Submit Review
                      </Button>
                    </form>
                  </div>
                )}
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900">All Reviews ({reviews.length})</h3>
                  {reviews.length === 0 ? (
                    <div className="text-sm text-slate-500">No reviews yet.</div>
                  ) : (
                    reviews.map(review => (
                      <div key={review.id} className="p-4 border border-slate-100 rounded-xl space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="text-sm font-bold text-slate-900">{review.reviewerName}</div>
                          <div className="flex items-center text-amber-400">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-current" : "text-slate-200"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{review.comment}</p>
                        <div className="text-[10px] text-slate-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-amber-500" /> {profile.location || "Location not specified"}
                  </div>
                  {profile.website && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <ExternalLink className="h-4 w-4 text-amber-500" /> 
                      <a href={profile.website} target="_blank" rel="noreferrer" className="hover:text-amber-600 underline">{profile.website}</a>
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-6 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">About {profile.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{profile.about || "No detailed description provided."}</p>
                </div>

                {profile.socialLinks && (
                  <div className="space-y-2 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Connect</h3>
                    <div className="flex gap-4">
                      {profile.socialLinks.instagram && <Instagram className="h-5 w-5 text-slate-400 hover:text-pink-600 cursor-pointer" />}
                      {profile.socialLinks.facebook && <Facebook className="h-5 w-5 text-slate-400 hover:text-blue-600 cursor-pointer" />}
                      {profile.socialLinks.twitter && <Twitter className="h-5 w-5 text-slate-400 hover:text-sky-500 cursor-pointer" />}
                      {profile.socialLinks.linkedin && <Linkedin className="h-5 w-5 text-slate-400 hover:text-blue-700 cursor-pointer" />}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Right Column (30%) - AI Consultant */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl sticky top-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">AI Business Advisor</h3>
                <p className="text-[10px] text-slate-400">Ask anything about growth</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {[
                "How to increase sales?",
                "Best marketing strategy?",
                "How to get investors?"
              ].map(q => (
                <button
                  key={q}
                  onClick={() => handleAskAI(q)}
                  className="block w-full text-left text-xs bg-slate-800 hover:bg-slate-700 p-2.5 rounded-lg transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {aiResponse && (
              <div className="bg-slate-800 rounded-xl p-4 mb-6 text-xs leading-relaxed border border-slate-700">
                {aiResponse}
              </div>
            )}

            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Ask your question..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAskAI(chatInput)}
                className="w-full bg-slate-800 border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-amber-500"
              />
              <Button 
                onClick={() => handleAskAI(chatInput)}
                disabled={isAiLoading || !chatInput.trim()}
                className="bg-amber-500 hover:bg-amber-600 rounded-xl px-3"
              >
                {isAiLoading ? <span className="animate-spin text-lg">⟳</span> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
