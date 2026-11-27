import { useState } from "react";
import { 
  X, MessageSquare, Share2, Award, ArrowUp, ArrowDown, Send, 
  Sparkles, Check, Image as ImageIcon, Quote, Shield, ExternalLink, UserCheck
} from "lucide-react";
import { useAppState, CommunityPost } from "@/hooks/useAppState";

interface RedditCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock community members
const TOP_MEMBERS = [
  {
    id: "m-1",
    name: "Sarah Sterling",
    role: "growth consultant",
    avatar: "bg-gradient-to-tr from-amber-500 to-orange-500",
    specialty: "POS Score Tuning",
    verified: true,
    rating: "4.9 ★"
  },
  {
    id: "m-2",
    name: "Amina Al-Jamil",
    role: "business owner",
    avatar: "bg-gradient-to-tr from-emerald-500 to-teal-600",
    specialty: "Organic Bakery, Score 96",
    verified: true,
    rating: "Rep 96"
  },
  {
    id: "m-3",
    name: "Marcus Vance",
    role: "b2b consultant",
    avatar: "bg-gradient-to-tr from-indigo-500 to-blue-600",
    specialty: "Wholesale escrow advisor",
    verified: true,
    rating: "5.0 ★"
  },
  {
    id: "m-4",
    name: "Kabir Dev",
    role: "business owner",
    avatar: "bg-gradient-to-tr from-rose-500 to-orange-600",
    specialty: "Eco-Tech Solutions, Score 92",
    verified: true,
    rating: "Rep 92"
  }
];

export default function RedditCommunityModal({ isOpen, onClose }: RedditCommunityModalProps) {
  const { 
    communityPosts, 
    addCommunityPost, 
    upvoteCommunityPost, 
    addCommunityComment,
    role,
    business
  } = useAppState();

  const [isJoined, setIsJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(18432);
  const [connectedMembers, setConnectedMembers] = useState<Record<string, boolean>>({});

  // Composer state
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postQuote, setPostQuote] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<string>(""); // "coffee" | "chart" | "team" | ""
  const [composerOpen, setComposerOpen] = useState(false);

  // Comments state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Vote directions state: { [postId]: 1 | -1 | 0 }
  const [userVoteDirections, setUserVoteDirections] = useState<Record<string, number>>({});

  if (!isOpen) return null;

  const handleVote = (postId: string, direction: number) => {
    const currentDirection = userVoteDirections[postId] || 0;
    let newDirection = direction;

    if (currentDirection === direction) {
      newDirection = 0;
    }

    const voteDiff = newDirection - currentDirection;
    upvoteCommunityPost(postId, voteDiff);
    setUserVoteDirections(prev => ({ ...prev, [postId]: newDirection }));
  };

  const handleConnect = (memberId: string) => {
    setConnectedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    addCommunityPost({
      author: role === "business" && business.name ? `u/${business.name.toLowerCase().replace(/\s+/g, "_")}` : "u/guest_advisor",
      role: role === "business" ? "business" : "consultant",
      avatarColor: role === "business" ? "bg-emerald-600" : "bg-amber-600",
      title: postTitle,
      content: postContent,
      photoType: selectedPhoto || undefined,
      quote: postQuote || undefined
    });

    // Reset composer
    setPostTitle("");
    setPostContent("");
    setPostQuote("");
    setSelectedPhoto("");
    setComposerOpen(false);
  };

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId] || "";
    if (!text.trim()) return;

    addCommunityComment(postId, {
      author: role === "business" && business.name ? `u/${business.name.toLowerCase().replace(/\s+/g, "_")}` : "u/current_user",
      avatarColor: "bg-slate-700",
      content: text
    });

    setCommentInputs(prev => ({ ...prev, [postId]: "" }));
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleJoin = () => {
    if (isJoined) {
      setIsJoined(false);
      setMemberCount(c => c - 1);
    } else {
      setIsJoined(true);
      setMemberCount(c => c + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-4xl h-[85vh] bg-slate-50 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200">
        
        {/* Banner with absolute close button */}
        <div className="h-24 bg-gradient-to-r from-orange-500 to-amber-500 shrink-0 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors z-20 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Subreddit Info Bar */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-orange-500 border-4 border-white shadow-md flex items-center justify-center -mt-10 z-10 text-white font-bold text-2xl">
                r/
              </div>
              <div>
                <h2 className="text-xl font-display font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  r/smartbiz
                  <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-600 font-bold px-2 py-0.5 rounded-full uppercase">Verified Ecosystem Lounge</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-slate-800">{memberCount.toLocaleString()}</span> members &bull; <span className="font-bold text-emerald-600">412 online</span>
                </p>
              </div>
            </div>

            <button
              onClick={toggleJoin}
              className={`px-6 py-2 rounded-full text-xs font-bold transition duration-200 cursor-pointer ${
                isJoined 
                  ? "bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200" 
                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-500/15"
              }`}
            >
              {isJoined ? "Joined" : "Join Community"}
            </button>
          </div>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 space-y-6">
          
          {/* SECTION 1: VERIFIED MEMBERS GRID */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Verified Community Members</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Founders &amp; Advisors</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TOP_MEMBERS.map((member) => (
                <div 
                  key={member.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3 text-center flex flex-col items-center justify-between transition hover:border-slate-200 hover:bg-white"
                >
                  <div className={`h-11 w-11 rounded-full ${member.avatar} flex items-center justify-center text-white font-extrabold text-sm shadow-sm relative`}>
                    {member.name.charAt(0)}
                    {member.verified && (
                      <span className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border border-slate-100">
                        <Shield className="h-3 w-3 fill-orange-500 text-white" />
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{member.name}</p>
                    <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-wider mt-0.5">{member.role}</p>
                    <span className="inline-block text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full mt-1.5 font-medium leading-none">
                      {member.specialty}
                    </span>
                  </div>
                  <button
                    onClick={() => handleConnect(member.id)}
                    className={`mt-3 w-full py-1 rounded-xl text-[10px] font-bold transition ${
                      connectedMembers[member.id]
                        ? "bg-slate-200 text-slate-600"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {connectedMembers[member.id] ? "Connected" : "Connect"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main Feed area */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Left Column (Composer & Feed) */}
            <div className="md:col-span-2 space-y-4">
              
              {/* SECTION 2: INTERACTIVE POST COMPOSER */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                {!composerOpen ? (
                  <div 
                    onClick={() => setComposerOpen(true)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-2xl transition duration-150"
                  >
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      U
                    </div>
                    <div className="flex-1 bg-slate-50 border border-slate-200/80 rounded-full px-4 py-2 text-xs text-slate-400 font-medium">
                      Share a strategy, quotes, or thoughts with the community...
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreatePost} className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800">Draft your Post</span>
                      <button 
                        type="button"
                        onClick={() => setComposerOpen(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="space-y-3">
                      <input 
                        type="text" 
                        required
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="Title (e.g. 3 tactics to speed up review counts)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
                      />
                      
                      <textarea
                        required
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Write your thoughts or strategies..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
                      />

                      <div className="flex items-center gap-2">
                        <Quote className="h-4 w-4 text-slate-400 shrink-0" />
                        <input 
                          type="text" 
                          value={postQuote}
                          onChange={(e) => setPostQuote(e.target.value)}
                          placeholder="Quote / Inspiration (optional)"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-1.5 text-[11px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
                        />
                      </div>

                      {/* Photo Selector Mock */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5" /> Attach Photo (Simulation)
                        </label>
                        <div className="flex gap-2">
                          {[
                            { key: "", label: "No Photo" },
                            { key: "coffee", label: "Store Front" },
                            { key: "chart", label: "AI Dashboard" }
                          ].map((photoOpt) => (
                            <button
                              key={photoOpt.key}
                              type="button"
                              onClick={() => setSelectedPhoto(photoOpt.key)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                                selectedPhoto === photoOpt.key
                                  ? "bg-slate-900 border-slate-900 text-white"
                                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {photoOpt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition duration-150 cursor-pointer"
                    >
                      Post to r/smartbiz
                    </button>
                  </form>
                )}
              </div>

              {/* SECTION 3: THE POST FEED */}
              <div className="space-y-4">
                {communityPosts.map((post) => {
                  const userVote = userVoteDirections[post.id] || 0;
                  const isCommentsExpanded = !!expandedComments[post.id];

                  return (
                    <article 
                      key={post.id}
                      className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex transition hover:border-slate-300 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                      {/* Voting side rail */}
                      <div className="bg-slate-50/50 w-11 sm:w-12 py-3.5 flex flex-col items-center border-r border-slate-100 shrink-0">
                        <button
                          onClick={() => handleVote(post.id, 1)}
                          className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200/60 cursor-pointer ${
                            userVote === 1 ? "text-orange-500" : "text-slate-400"
                          }`}
                        >
                          <ArrowUp className="h-4.5 w-4.5 stroke-[3px]" />
                        </button>
                        
                        <span className={`text-xs font-extrabold my-1 ${
                          userVote === 1 ? "text-orange-500" : userVote === -1 ? "text-blue-500" : "text-slate-700"
                        }`}>
                          {post.votes}
                        </span>
                        
                        <button
                          onClick={() => handleVote(post.id, -1)}
                          className={`p-1.5 rounded-lg transition-colors hover:bg-slate-200/60 cursor-pointer ${
                            userVote === -1 ? "text-blue-500" : "text-slate-400"
                          }`}
                        >
                          <ArrowDown className="h-4.5 w-4.5 stroke-[3px]" />
                        </button>
                      </div>

                      {/* Main Post block */}
                      <div className="flex-1 p-4 sm:p-5 flex flex-col">
                        
                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-semibold mb-2">
                          <div className={`h-4.5 w-4.5 rounded-full ${post.avatarColor || 'bg-slate-600'} text-white flex items-center justify-center text-[8px] font-bold`}>
                            {post.author.charAt(2).toUpperCase()}
                          </div>
                          <span className="text-slate-800">{post.author}</span>
                          <span>&bull;</span>
                          <span>{post.time}</span>
                          
                          <span className="ml-auto text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 capitalize">
                            {post.role}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                          {post.title}
                        </h4>

                        {/* If Quote is attached */}
                        {post.quote && (
                          <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border-l-4 border-amber-500 text-xs italic text-slate-600">
                            "{post.quote}"
                          </div>
                        )}

                        {/* Content text */}
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                          {post.content}
                        </p>

                        {/* Photo Attachments (High-fidelity Mockups) */}
                        {post.photoType === "coffee" && (
                          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-tr from-orange-100 to-amber-100 h-40 flex items-center justify-center relative">
                            <div className="absolute inset-0 bg-black/5" />
                            <div className="text-center p-4 z-10">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600 block mb-1">Store Front Simulation</span>
                              <span className="font-display text-lg font-black text-slate-800">LUNA BISTRO &amp; CAFE</span>
                              <p className="text-[10px] text-slate-500 mt-1">Ecosystem Verified Node &bull; CNIC Approved</p>
                            </div>
                          </div>
                        )}

                        {post.photoType === "chart" && (
                          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 h-40 flex flex-col justify-between relative">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-b border-slate-800 pb-2">
                              <span>AI MATCH INDEXING</span>
                              <span className="text-emerald-500">OPTIMAL MATCH (94%)</span>
                            </div>
                            <div className="flex items-end justify-between gap-2 h-16 pt-2">
                              <div className="w-full bg-slate-800 h-[30%] rounded" />
                              <div className="w-full bg-slate-800 h-[45%] rounded" />
                              <div className="w-full bg-slate-800 h-[65%] rounded" />
                              <div className="w-full bg-orange-500 h-[94%] rounded animate-pulse" />
                            </div>
                            <span className="text-[9px] text-slate-500 text-center block mt-1">Simulated performance ledger metrics</span>
                          </div>
                        )}

                        {/* SPECIAL RENDER: VERIFIED SUCCESS SCORECARD */}
                        {post.isStatsPost && post.stats && (
                          <div className="mt-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 flex flex-col sm:flex-row items-center gap-4 justify-between relative overflow-hidden">
                            <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/10 rounded-full blur-lg" />
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-emerald-500/15 border border-emerald-300 text-emerald-600 flex items-center justify-center shrink-0">
                                <Shield className="h-5.5 w-5.5 fill-current" />
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Verified Success Story Stats</span>
                                <span className="text-xs font-extrabold text-slate-900 block leading-tight">Ecosystem Ledger Proof</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 shrink-0 text-center">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Rep Score</span>
                                <span className="text-base font-black text-slate-800">{post.stats.score}/100</span>
                              </div>
                              <div className="w-px h-6 bg-slate-200" />
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Reviews</span>
                                <span className="text-base font-black text-slate-800">{post.stats.reviewsCount}</span>
                              </div>
                              <div className="w-px h-6 bg-slate-200" />
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Visitors</span>
                                <span className="text-base font-black text-slate-800">{post.stats.visitorsCount}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions bar */}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-500">
                          <button 
                            onClick={() => toggleComments(post.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition duration-150 cursor-pointer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{post.comments.length} Comments</span>
                          </button>

                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition duration-150 cursor-pointer">
                            <Share2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Share</span>
                          </button>

                          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition duration-150 cursor-pointer ml-auto">
                            <Award className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Award</span>
                          </button>
                        </div>

                        {/* Comments dropdown box */}
                        {isCommentsExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                            
                            {/* Input Form */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ""}
                                onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                                placeholder="Write a comment..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 focus:bg-white transition"
                              />
                              <button
                                onClick={() => handleCommentSubmit(post.id)}
                                className="h-8 w-8 rounded-xl bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition shadow-sm cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Comments loop */}
                            <div className="space-y-3 pl-1.5 border-l-2 border-slate-200">
                              {post.comments.map((comment, idx) => (
                                <div key={idx} className="text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                                    <div className={`h-4.5 w-4.5 rounded-full ${comment.avatarColor || 'bg-slate-600'} text-white flex items-center justify-center text-[7px] font-bold`}>
                                      {comment.author.charAt(2).toUpperCase()}
                                    </div>
                                    <span className="text-slate-700">{comment.author}</span>
                                    <span>&bull;</span>
                                    <span>{comment.time}</span>
                                  </div>
                                  <p className="text-slate-600 pl-6 leading-normal">{comment.content}</p>
                                </div>
                              ))}
                            </div>

                          </div>
                        )}

                      </div>
                    </article>
                  );
                })}
              </div>

            </div>

            {/* Right Column (Community card and info) */}
            <div className="space-y-4">
              
              {/* Community card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Shield className="h-4.5 w-4.5 text-orange-500" />
                  <h4 className="text-xs font-bold uppercase text-slate-900 tracking-wider">About Lounge</h4>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  The primary digital lounge for verified InvestBiz entrepreneurs, accredited capital matchmakers, and industry consultants.
                </p>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Members</span>
                    <span className="font-bold text-slate-800">{memberCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Active Online</span>
                    <span className="font-bold text-emerald-600">412 online</span>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 space-y-2">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Insider Posting Node
                    </p>
                    <p className="leading-relaxed">Only verified business owners with registered CNIC nodes can publish official scorecard metrics directly to the feed.</p>
                  </div>
                </div>
              </div>

              {/* Ecosystem verification callout */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 text-white shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-amber-400 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Ecosystem Power</h4>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Ready to attract capital? Sync your POS customer reviews and optimize scores using the AI Consultant. Verify stats from your dashboard to post a scorecard.
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
