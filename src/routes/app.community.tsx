import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ChevronRight,
  TrendingUp,
  User,
  Briefcase,
  Bot,
  MessageSquare,
  Bookmark,
  Share2,
  PlusCircle,
  ThumbsUp,
  Filter,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  Award,
  AlertCircle,
  Compass,
  ArrowUp,
  UserPlus,
  UserMinus,
  Loader2,
  ShieldCheck,
  Globe,
  Star,
  Send,
  X,
  ExternalLink,
  Lock,
  Heart,
  ChevronLeft,
  Info,
  Camera,
  Edit2,
  Calendar,
  DollarSign,
  Video,
  Users
} from "lucide-react";
import { useAppState, CommunityPost, Role } from "@/hooks/useAppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster, toast } from "sonner";

// Import premium images generated for the community feed
import officeImg from "@/assets/community_office.png";
import analyticsImg from "@/assets/community_analytics.png";
import cafeImg from "@/assets/community_cafe.png";
import teamImg from "@/assets/community_team.png";

export const Route = createFileRoute("/app/community")({
  component: CommunityPage,
});

// Map of photoType to local imported asset
const IMAGE_MAP: Record<string, string> = {
  office: officeImg,
  chart: analyticsImg,
  coffee: cafeImg,
  team: teamImg
};

type Seminar = {
  id: string;
  subject: string;
  hostName: string;
  hostRoleText: string;
  dateTime: string;
  outline: string;
  fee: string;
  authorId: string; // owner identity key for routing logic
};

function CommunityPage() {
  const {
    role,
    isLoggedIn,
    business,
    consultant,
    communityPosts,
    savedPosts,
    followedUsers,
    likedPosts,
    currentUser,
    points,
    weaknessFeedback,
    addCommunityPost,
    mergeCommunityPostsFromBackend,
    addCommunityComment,
    toggleSavePost,
    toggleFollowUser,
    toggleLikePost,
    registerCommunityMember,
    updateCurrentUserProfile,
    logoutCommunityUser,
    upvoteCommunityPost,
    addWeaknessFeedback,
    verifyPrediction,
    acceptQuote,
    submitProblem,
    registerForSeminar
  } = useAppState();

  const navigate = useNavigate();

  useEffect(() => {
    let unsub: (() => void) | undefined;
    void import("@/services/firebaseService").then(({ subscribeToCommunityPosts }) => {
      unsub = subscribeToCommunityPosts((posts) => {
        mergeCommunityPostsFromBackend(posts);
      });
    });
    return () => unsub?.();
  }, [mergeCommunityPostsFromBackend]);

  // Active Lounge feed tabs: "insight" | "marketing" | "problems"
  const [loungeTab, setLoungeTab] = useState<"insight" | "marketing" | "problems">("insight");
  const [searchQuery, setSearchQuery] = useState("");

  // Post Creator States
  const [showCreator, setShowCreator] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [stickyColor, setStickyColor] = useState<"yellow" | "blue" | "green">("yellow");
  const [postPhotoType, setPostPhotoType] = useState("");
  const [predictionDuration, setPredictionDuration] = useState("45");
  const [blueprintBefore, setBlueprintBefore] = useState("");
  const [blueprintAfter, setBlueprintAfter] = useState("");
  const [materialRequirement, setMaterialRequirement] = useState("");
  const [problemUrgency, setProblemUrgency] = useState<"High" | "Medium" | "Low">("High");
  const [problemTag, setProblemTag] = useState("Logistics");

  // Seminars List State
  const [seminars, setSeminars] = useState<Seminar[]>([
    {
      id: "sem-1",
      subject: "B2B Logistics & Freight Bottlenecks",
      hostName: "Sarah Sterling",
      hostRoleText: "Alpha Growth Advisors",
      dateTime: "June 20, 2026 at 4:00 PM",
      outline: "Troubleshooting dispatch congestion in the central Punjab wholesale supply lines.",
      fee: "PKR 3,500",
      authorId: "sarah_sterling"
    },
    {
      id: "sem-2",
      subject: "Retail Loyalty App & Footfall Tactics",
      hostName: "Aman Ullah",
      hostRoleText: "BeanCraft Coffee",
      dateTime: "June 22, 2026 at 6:00 PM",
      outline: "How we leveraged SmartBiz review ledger integrations to scale local sales.",
      fee: "PKR 1,500",
      authorId: "aman_ullah"
    }
  ]);

  const [showSeminarCreator, setShowSeminarCreator] = useState(false);
  const [newSemSubject, setNewSemSubject] = useState("");
  const [newSemDateTime, setNewSemDateTime] = useState("");
  const [newSemOutline, setNewSemOutline] = useState("");
  const [newSemFee, setNewSemFee] = useState("PKR 2,000");

  const [minDateTime, setMinDateTime] = useState("");

  useEffect(() => {
    const updateMinDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setMinDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    };
    updateMinDateTime();
    const interval = setInterval(updateMinDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Expand comments & input states
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newCommentText, setNewCommentText] = useState<Record<string, string>>({});

  // Auth gate & profile state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [viewProfileUser, setViewProfileUser] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<"posts" | "comments">("posts");
  const [improvementText, setImprovementText] = useState("");

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);


  // Profile Sticky Note Creator states
  const [profileStickyType, setProfileStickyType] = useState<"quote" | "photo" | "data">("quote");
  const [profileStickyTitle, setProfileStickyTitle] = useState("");
  const [profileStickyContent, setProfileStickyContent] = useState("");
  const [profileStickyColor, setProfileStickyColor] = useState<"yellow" | "blue" | "green" | "pink">("yellow");
  const [profileStickyPhoto, setProfileStickyPhoto] = useState("");
  const [profileStickyBefore, setProfileStickyBefore] = useState("");
  const [profileStickyAfter, setProfileStickyAfter] = useState("");
  const profileStickyPhotoRef = useRef<HTMLInputElement>(null);

  // Profile Seminars states
  const [showProfileSemCreator, setShowProfileSemCreator] = useState(false);
  const [profSemSubject, setProfSemSubject] = useState("");
  const [profSemDateTime, setProfSemDateTime] = useState("");
  const [profSemOutline, setProfSemOutline] = useState("");
  const [profSemFee, setProfSemFee] = useState("PKR 2,000");
  const [profSemTagFollowers, setProfSemTagFollowers] = useState(false);

  const handlePublishProfileSeminar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profSemSubject.trim() || !profSemDateTime.trim() || !profSemOutline.trim()) {
      toast.error("Please fill in all seminar fields.");
      return;
    }

    const selectedDate = new Date(profSemDateTime);
    const now = new Date();
    if (selectedDate < now) {
      toast.error("Please select a future date and time. Previous dates are not allowed.");
      return;
    }

    const formattedDateTime = (() => {
      try {
        const date = new Date(profSemDateTime);
        if (isNaN(date.getTime())) return profSemDateTime;
        return date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        }) + " at " + date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        });
      } catch (e) {
        return profSemDateTime;
      }
    })();

    const hostName = currentUser.name;
    const hostRoleText = role === "business" ? (currentUser.businessName || "Business Owner") : (currentUser.consultancyName || "AI Consultant");

    const newSeminar: Seminar = {
      id: "sem-" + Math.random().toString(36).substr(2, 9),
      subject: profSemSubject,
      hostName,
      hostRoleText,
      dateTime: formattedDateTime,
      outline: profSemOutline,
      fee: profSemFee,
      authorId: currentUser.name.trim().toLowerCase().replace(/\s+/g, "_")
    };

    setSeminars([newSeminar, ...seminars]);
    
    if (profSemTagFollowers) {
      toast.success(`Broadcast notification successfully sent to all ${followerCount.toLocaleString()} followers!`);
    }
    
    toast.success(`Live Professional Seminar scheduled successfully!`);
    
    // Reset form
    setProfSemSubject("");
    setProfSemDateTime("");
    setProfSemOutline("");
    setProfSemFee("PKR 2,000");
    setProfSemTagFollowers(false);
    setShowProfileSemCreator(false);
  };

  const handleLaunchMeeting = (semSubject: string) => {
    toast.success(`Launching meeting room for "${semSubject}"... Initializing 30-minute live video session on SmartBiz meeting server.`);
  };

  const handleJoinMeeting = (semSubject: string) => {
    toast.success(`Connecting to meeting room for "${semSubject}"... Joining 30-minute live video session.`);
  };


  const handlePublishProfileSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileStickyTitle.trim() || !profileStickyContent.trim()) {
      toast.error("Please fill in title and note content.");
      return;
    }
    const cleanName = currentUser.name.trim().toLowerCase().replace(/\s+/g, "_") || "user";
    const authorName = `u/${cleanName}`;
    const authorRole: CommunityPost["role"] = (role === "business" || role === "consultant") ? role : "guest";

    if (profileStickyType === "quote") {
      addCommunityPost({
        author: authorName,
        role: authorRole,
        category: "Insight Board",
        tag: "Discussion",
        avatarColor: profileStickyColor,
        title: profileStickyTitle,
        content: profileStickyContent
      });
      toast.success("Quote sticky note published to the community feed!");
    } else if (profileStickyType === "photo") {
      addCommunityPost({
        author: authorName,
        role: authorRole,
        category: "Insight Board",
        tag: "Discussion",
        avatarColor: profileStickyColor,
        title: profileStickyTitle,
        content: profileStickyContent,
        proofAttachment: profileStickyPhoto
      });
      toast.success("Photo sticky note published to the community feed!");
    } else if (profileStickyType === "data") {
      addCommunityPost({
        author: authorName,
        role: authorRole,
        category: "Insight Board",
        tag: "Discussion",
        avatarColor: profileStickyColor,
        title: profileStickyTitle,
        content: profileStickyContent,
        isMarketingBlueprint: true,
        beforeMetrics: profileStickyBefore,
        afterMetrics: profileStickyAfter
      });
      toast.success("Data State sticky note published to the community feed!");
    }

    setProfileStickyTitle("");
    setProfileStickyContent("");
    setProfileStickyPhoto("");
    setProfileStickyBefore("");
    setProfileStickyAfter("");
  };

  const getProfileDetails = (username: string) => {
    const cleanUsername = username.replace("u/", "").toLowerCase().trim();
    const cleanCurrentName = currentUser.name.toLowerCase().trim().replace(/\s+/g, "_");

    const isOwn = cleanUsername === cleanCurrentName || username === currentUser.name;

    if (isOwn) {
      return {
        name: currentUser.name,
        username: `u/${cleanCurrentName}`,
        role: role,
        roleBadge: currentUser.roleBadge,
        businessName: currentUser.businessName || business.name,
        consultancyName: currentUser.consultancyName || consultant.name,
        bio: currentUser.bio || "Active community member. Strategy enthusiast open to collaboration.",
        avatarUrl: currentUser.avatarUrl,
        coverUrl: currentUser.coverUrl,
        followerCount: followerCount,
        points: points,
        isOwn: true
      };
    }

    if (cleanUsername.includes("growth_hacker_pk") || cleanUsername.includes("sterling") || cleanUsername.includes("sarah")) {
      return {
        name: "Sarah Sterling",
        username: "u/growth_hacker_pk",
        role: "consultant" as const,
        roleBadge: "Verified Consultant",
        consultancyName: "Alpha Growth Advisors",
        bio: "Certified AI Consultant specializing in B2B supply lines and local tech integration.",
        avatarUrl: "",
        coverUrl: "",
        followerCount: 15200,
        points: 1350,
        isOwn: false
      };
    }

    if (cleanUsername.includes("coffee_bean_founder") || cleanUsername.includes("ullah") || cleanUsername.includes("aman")) {
      return {
        name: "Aman Ullah",
        username: "u/coffee_bean_founder",
        role: "business" as const,
        roleBadge: "Business Owner",
        businessName: "BeanCraft Coffee",
        bio: "Owner of BeanCraft Coffee. Focused on importing, packaging, and retail footprint expansion.",
        avatarUrl: "",
        coverUrl: "",
        followerCount: 11200,
        points: 850,
        isOwn: false
      };
    }

    if (cleanUsername.includes("retail_revolution") || cleanUsername.includes("malik") || cleanUsername.includes("zain")) {
      return {
        name: "Zain Malik",
        username: "u/retail_revolution",
        role: "business" as const,
        roleBadge: "Business Owner",
        businessName: "Retail Revolution Hub",
        bio: "Spearheading modern retail and B2B courier standardizations in central Punjab.",
        avatarUrl: "",
        coverUrl: "",
        followerCount: 4500,
        points: 380,
        isOwn: false
      };
    }

    if (cleanUsername.includes("fashion_boutique_hyd") || cleanUsername.includes("raza") || cleanUsername.includes("komal")) {
      return {
        name: "Komal Raza",
        username: "u/fashion_boutique_hyd",
        role: "business" as const,
        roleBadge: "Business Owner",
        businessName: "Hyderabadi Couture",
        bio: "Curating luxury apparel logistics, designer packaging, and regional B2B matches.",
        avatarUrl: "",
        coverUrl: "",
        followerCount: 950,
        points: 180,
        isOwn: false
      };
    }

    const readableName = username.replace("u/", "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return {
      name: readableName,
      username: username.startsWith("u/") ? username : `u/${username}`,
      role: "guest" as const,
      roleBadge: "Community Member",
      bio: "Explore regional wholesale and strategy partnerships on SmartBiz.",
      avatarUrl: "",
      coverUrl: "",
      followerCount: 320,
      points: 45,
      isOwn: false
    };
  };

  const handleAuthorClick = (post: any) => {
    const authorName = typeof post === "string" ? post : post.author;
    const profile = getProfileDetails(authorName);
    setViewProfileUser(profile);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          updateCurrentUserProfile({ coverUrl: reader.result });
          setViewProfileUser((prev: any) => {
            if (prev && prev.isOwn) {
              return { ...prev, coverUrl: reader.result };
            }
            return prev;
          });
          toast.success("Cover banner updated!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          updateCurrentUserProfile({ avatarUrl: reader.result });
          setViewProfileUser((prev: any) => {
            if (prev && prev.isOwn) {
              return { ...prev, avatarUrl: reader.result };
            }
            return prev;
          });
          toast.success("Profile avatar updated!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getVerificationTitle = (followers: number, pts: number) => {
    if (followers >= 50000 && pts >= 5000) {
      return "Gold Title Holder";
    }
    if (followers >= 10000 && pts >= 1000) {
      return "Silver Title Holder";
    }
    if (followers >= 1000 && pts >= 500) {
      return "Bronze Title Holder";
    }
    return null;
  };


  // Randomize or select background color for sticky notes
  const colorClasses = {
    yellow: "bg-[#FFF9A6] border-yellow-300/40 shadow-xs",
    pink: "bg-[#FFC5D9] border-pink-300/40 shadow-xs",
    blue: "bg-[#A2E8FF] border-blue-300/40 shadow-xs",
    green: "bg-[#B2F5B2] border-green-300/40 shadow-xs"
  };

  const getStickyColorClass = (post: CommunityPost) => {
    const validColors = ["yellow", "blue", "green", "pink"];
    let colorKey = post.avatarColor;
    if (!validColors.includes(colorKey)) {
      let hash = 0;
      for (let i = 0; i < post.id.length; i++) {
        hash = post.id.charCodeAt(i) + ((hash << 5) - hash);
      }
      colorKey = validColors[Math.abs(hash) % validColors.length];
    }
    return colorClasses[colorKey as "yellow" | "blue" | "green" | "pink"];
  };

  // Follower Milestones dynamic calculator
  // Default followers is 12,500, displaying the Silver Badge.
  const followerCount = currentUser.followerCount || 12500;

  const getFollowerBadge = (followers: number) => {
    if (followers >= 100000) {
      return {
        name: "Gold Milestone Badge",
        desc: "Gold B2B Oracle ✦ 100K+ Followers",
        style: "bg-amber-100 text-amber-800 border-amber-400 font-extrabold"
      };
    }
    if (followers >= 10000) {
      return {
        name: "Silver Milestone Badge",
        desc: "Silver Growth Leader ✦ 10K+ Followers",
        style: "bg-slate-100 text-slate-800 border-slate-400 font-extrabold"
      };
    }
    if (followers >= 1000) {
      return {
        name: "Bronze Milestone Badge",
        desc: "Bronze Influencer ✦ 1K+ Followers",
        style: "bg-orange-50 text-orange-800 border-orange-400/50 font-extrabold"
      };
    }
    return {
      name: "Beginner Badge",
      desc: "Community Novice ✦ <1K Followers",
      style: "bg-slate-50 text-slate-500 border-slate-200"
    };
  };

  const activeFollowerBadge = getFollowerBadge(followerCount);

  // Expose user role display subtexts dynamically
  const getUserSubtext = (profileName: string, userRole: string) => {
    if (isLoggedIn && (profileName === currentUser.name || profileName === `u/${currentUser.name.trim().toLowerCase().replace(/\s+/g, "_")}`)) {
      if (role === "business") return currentUser.businessName || "Business Owner";
      if (role === "consultant") return currentUser.consultancyName || "AI Consultant";
      return "Community Member";
    }
    // Static registries for other authors
    if (profileName.includes("coffee_bean_founder")) return "BeanCraft Coffee";
    if (profileName.includes("marketing_guru_advisor")) return "Sterling Brand Advisors";
    if (profileName.includes("growth_hacker_pk")) return "Alpha Growth Advisors";
    if (profileName.includes("fashion_boutique_hyd")) return "Hyderabadi Couture";
    return "Community Member";
  };

  // Publish dynamic lounge cards
  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }
    // Role Gate: Only Business Owners and Wholesalers can publish sticky notes
    if (role === "entrepreneur") {
      toast.error("Entrepreneurs can view community strategies and sticky notes, but cannot post to the standard feed.");
      return;
    }
    if (role !== "business" && role !== "consultant") {
      toast.error("Permission Denied: Only Business Owners and Wholesalers can post to the Insight Board.");
      return;
    }

    if (!postTitle.trim() || !postContent.trim()) {
      toast.error("Please fill in title and description.");
      return;
    }

    const cleanName = currentUser.name.trim().toLowerCase().replace(/\s+/g, "_") || "user";
    const authorName = `u/${cleanName}`;
    const authorRole: CommunityPost["role"] = (role === "business" || role === "consultant") ? role : "guest";

    if (loungeTab === "insight") {
      const isPred = postTitle.toLowerCase().includes("prediction") || postTitle.includes("🔮");
      addCommunityPost({
        author: authorName,
        role: authorRole,
        category: "Insight Board",
        tag: isPred ? "Prediction" : "Discussion",
        avatarColor: stickyColor, // store color choice in avatarColor field for styling stickies
        title: postTitle,
        content: postContent,
        isPrediction: isPred,
        predictionTimer: isPred ? parseInt(predictionDuration) : undefined,
        predictionExpiryTime: isPred ? (Date.now() + parseInt(predictionDuration) * 1000) : undefined,
        predictionStatus: isPred ? "active" : undefined
      });
      toast.success("Sticky note card published successfully!");
    } else if (loungeTab === "marketing") {
      const isPkg = materialRequirement.trim().length > 0;
      addCommunityPost({
        author: authorName,
        role: authorRole,
        category: isPkg ? "B2B Packaging" : "Marketing Strategy",
        tag: isPkg ? "Requirements" : "Blueprint",
        avatarColor: "bg-emerald-500",
        title: postTitle,
        content: postContent,
        isMarketingBlueprint: !isPkg,
        beforeMetrics: !isPkg ? blueprintBefore : undefined,
        afterMetrics: !isPkg ? blueprintAfter : undefined,
        isPackagingReq: isPkg,
        materialType: isPkg ? materialRequirement : undefined,
        packagingQuotes: isPkg ? [
          {
            id: "quote-1",
            supplierName: "Sarah Sterling (Wholesaler)",
            avatarColor: "bg-gradient-to-tr from-purple-500 to-pink-600",
            price: "PKR 55,000",
            timeline: "2 Days Express",
            accepted: false
          },
          {
            id: "quote-2",
            supplierName: "Gujranwala Package Co.",
            avatarColor: "bg-gradient-to-tr from-amber-500 to-orange-500",
            price: "PKR 49,000",
            timeline: "5 Days Standard",
            accepted: false
          }
        ] : []
      });
      toast.success("Marketing blueprint/packaging requirement added.");
    } else if (loungeTab === "problems") {
      submitProblem(postTitle, postContent, problemUrgency, problemTag);
      toast.success("Operational hurdle posted and routed!");
    }

    setPostTitle("");
    setPostContent("");
    setBlueprintBefore("");
    setBlueprintAfter("");
    setMaterialRequirement("");
    setShowCreator(false);
  };

  // Publish new masterclass seminar
  const handlePublishSeminar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn || (role !== "business" && role !== "consultant")) {
      toast.error("Permission Denied: Only Business Owners and AI Consultants can host seminars.");
      return;
    }
    if (!newSemSubject.trim() || !newSemDateTime.trim() || !newSemOutline.trim()) {
      toast.error("Please fill in all seminar fields.");
      return;
    }

    const selectedDate = new Date(newSemDateTime);
    const now = new Date();
    if (selectedDate < now) {
      toast.error("Please select a future date and time. Previous dates are not allowed.");
      return;
    }

    const formattedDateTime = (() => {
      try {
        const date = new Date(newSemDateTime);
        if (isNaN(date.getTime())) return newSemDateTime;
        return date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric"
        }) + " at " + date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        });
      } catch (e) {
        return newSemDateTime;
      }
    })();

    const hostName = currentUser.name;
    const hostRoleText = role === "business" ? (currentUser.businessName || "Business Owner") : (currentUser.consultancyName || "AI Consultant");

    const newSeminar: Seminar = {
      id: "sem-" + Math.random().toString(36).substr(2, 9),
      subject: newSemSubject,
      hostName,
      hostRoleText,
      dateTime: formattedDateTime,
      outline: newSemOutline,
      fee: newSemFee,
      authorId: currentUser.name.trim().toLowerCase().replace(/\s+/g, "_")
    };

    setSeminars([newSeminar, ...seminars]);
    setShowSeminarCreator(false);
    setNewSemSubject("");
    setNewSemDateTime("");
    setNewSemOutline("");
    toast.success("Masterclass seminar published to Keyrooms list!");
  };

  const handleAddComment = (postId: string) => {
    const text = newCommentText[postId];
    if (!text || !text.trim()) return;

    const cleanName = currentUser.name.trim().toLowerCase().replace(/\s+/g, "_") || "user";
    addCommunityComment(postId, {
      author: `u/${cleanName}`,
      avatarColor: "bg-gradient-to-tr from-amber-500 to-orange-500",
      content: text
    });
    setNewCommentText(prev => ({ ...prev, [postId]: "" }));
    toast.success("Comment posted!");
  };

  // Filter posts
  const getFilteredPosts = () => {
    let base = communityPosts;
    if (searchQuery.trim().length > 0) {
      base = base.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return base;
  };

  const visiblePosts = getFilteredPosts();

  const handleAuthComplete = (username: string, chosenRole: Role, advancedFields: any) => {
    registerCommunityMember(username, chosenRole, advancedFields);
    setShowAuthModal(false);
    toast.success(`Welcome to the Lounge, ${username}!`);
  };

  const profilePosts = viewProfileUser
    ? communityPosts.filter(post => {
      const authorClean = post.author.toLowerCase().trim();
      const targetCleanOwn = `u/${currentUser.name.trim().toLowerCase().replace(/\s+/g, "_")}`;
      const targetCleanPublic = viewProfileUser.username ? viewProfileUser.username.toLowerCase().trim() : "";

      if (viewProfileUser.isOwn) {
        return authorClean === targetCleanOwn;
      } else {
        return authorClean === targetCleanPublic;
      }
    })
    : [];

  const profileComments: { postTitle: string; content: string; time: string }[] = [];
  if (viewProfileUser) {
    const targetCleanOwn = `u/${currentUser.name.trim().toLowerCase().replace(/\s+/g, "_")}`;
    const targetCleanPublic = viewProfileUser.username ? viewProfileUser.username.toLowerCase().trim() : "";

    communityPosts.forEach(post => {
      post.comments.forEach(comment => {
        const authorClean = comment.author.toLowerCase().trim();
        const isCommentOwner = viewProfileUser.isOwn
          ? authorClean === targetCleanOwn
          : authorClean === targetCleanPublic;

        if (isCommentOwner) {
          profileComments.push({
            postTitle: post.title,
            content: comment.content,
            time: comment.time
          });
        }
      });
    });
  }

  const isUserAllowedToPost = isLoggedIn && (role === "business" || role === "consultant");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-display selection:bg-amber-500 selection:text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Kalam:wght@400;700&display=swap');
      `}</style>
      <Toaster position="bottom-right" theme="light" closeButton />

      {/* Unified Lounge Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-[1560px] mx-auto px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {role === "investor" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8 border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => navigate({ to: "/app/investor" })}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Investor Desk
              </Button>
            )}
            {role === "entrepreneur" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => navigate({ to: "/founder/dashboard" })}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Founder Dashboard
              </Button>
            )}
            {role === "business" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => navigate({ to: "/app/score" })}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Business Profile
              </Button>
            )}
            {role === "consultant" && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs h-8"
                onClick={() => navigate({ to: "/app/wholesale" })}
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                Wholesale Desk
              </Button>
            )}
            <button
              onClick={() => navigate({ to: "/" })}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 hover:opacity-90 transition duration-300"
            >
              <Sparkles className="h-4.5 w-4.5 text-slate-950" />
            </button>
            <span className="font-display font-extrabold text-sm tracking-tight text-slate-950 flex items-center gap-2">
              SmartBiz AI <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-600 px-2.5 py-0.5 rounded-full font-mono font-bold">Lounge</span>
            </span>
          </div>

          <div className="flex-grow max-w-md relative">
            <Input
              placeholder="Search feed articles, predictions, blueprints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-full bg-slate-100 border-slate-200 focus:border-amber-500 text-xs text-slate-805"
            />
            <Filter className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="capitalize font-medium">{currentUser.roleBadge} ({points} pts)</span>
                </div>
                <Button
                  onClick={() => {
                    logoutCommunityUser();
                    toast.success("Logged out successfully!");
                  }}
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs border-rose-200 text-rose-600 hover:bg-rose-50 h-8"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-full text-xs px-5 shadow-md"
              >
                Join Lounge
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* FULL-WIDTH GRID ALIGNMENT: 320px | 1fr | 340px — always 3 columns */}
      <div
        className="py-6 flex-grow animate-in fade-in duration-500"
        style={{
          width: "100%",
          maxWidth: "1560px",
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "320px 1fr 340px",
          gap: "24px"
        }}
      >

        {/* LEFT PANEL: PROFILE WORKSPACE & GAMIFICATION METRICS (320px) */}
        <aside className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Lounge Workspace</h3>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold text-lg">
                {isLoggedIn ? currentUser.name.charAt(0).toUpperCase() : "G"}
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-slate-900 truncate">{isLoggedIn ? currentUser.name : "Anonymous Guest"}</h4>
                <p className="text-[10px] text-amber-600 truncate font-semibold mt-0.5">
                  {isLoggedIn ? (
                    role === "business"
                      ? (currentUser.businessName || business.name || "Business Owner")
                      : role === "consultant"
                        ? (currentUser.consultancyName || consultant.name || "AI Consultant")
                        : "Community Member"
                  ) : "Guest Mode"}
                </p>
              </div>
            </div>

            {/* Simple Tally Counter of Total Posts and Followers */}
            {isLoggedIn && (
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-center">
                <div>
                  <span className="text-[9px] text-slate-450 uppercase font-bold block">Total Posts</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {communityPosts.filter(p => p.author.toLowerCase() === `u/${currentUser.name.trim().toLowerCase().replace(/\s+/g, "_")}`).length}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-450 uppercase font-bold block">Followers</span>
                  <span className="text-xs font-extrabold text-slate-800">
                    {followerCount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Base Action Button */}
            {isLoggedIn ? (
              viewProfileUser ? (
                <Button
                  onClick={() => setViewProfileUser(null)}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs h-9.5 rounded-xl shadow-md cursor-pointer"
                >
                  Back to Lounge Feed
                </Button>
              ) : (
                <Button
                  onClick={() => setViewProfileUser(getProfileDetails(currentUser.name))}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs h-9.5 rounded-xl shadow-md cursor-pointer"
                >
                  View Your Profile
                </Button>
              )
            ) : (
              <Button
                onClick={() => setShowAuthModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs h-9.5 rounded-xl shadow-md cursor-pointer"
              >
                Authenticate to Track
              </Button>
            )}
          </div>

        </aside>

        {viewProfileUser ? (
          /* PROFILE CENTER COLUMN */
          <main className="space-y-6">
            <div className="relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

              {/* Cover Banner */}
              <div
                onClick={() => {
                  if (viewProfileUser.isOwn) {
                    coverInputRef.current?.click();
                  }
                }}
                className={`h-44 md:h-52 w-full relative bg-gradient-to-r from-amber-500/10 to-yellow-500/10 ${viewProfileUser.isOwn ? "cursor-pointer group hover:opacity-95 transition" : ""
                  }`}
              >
                {viewProfileUser.coverUrl ? (
                  <img src={viewProfileUser.coverUrl} alt="Cover Banner" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-1">
                    {viewProfileUser.isOwn ? (
                      <>
                        <span>📸 Click to upload cover banner picture</span>
                        <span className="text-[10px] text-slate-300 font-normal">Supports JPG, PNG</span>
                      </>
                    ) : (
                      <span>No cover banner illustration</span>
                    )}
                  </div>
                )}

                {viewProfileUser.isOwn && (
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                    <Camera className="h-4.5 w-4.5" /> Upload Cover Illustration
                  </div>
                )}

                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverUpload}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Overlapping Avatar */}
              <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-[-40px] sm:mt-[-50px] z-10">
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                  <div
                    onClick={() => {
                      if (viewProfileUser.isOwn) {
                        avatarInputRef.current?.click();
                      }
                    }}
                    className={`h-22 w-22 rounded-2xl border-4 border-white bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-bold text-3xl shadow-md relative overflow-hidden shrink-0 ${viewProfileUser.isOwn ? "cursor-pointer group hover:scale-[1.02] transition" : ""
                      }`}
                  >
                    {viewProfileUser.avatarUrl ? (
                      <img src={viewProfileUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{viewProfileUser.name.charAt(0).toUpperCase()}</span>
                    )}

                    {viewProfileUser.isOwn && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold text-center p-0.5">
                        Upload Avatar
                      </div>
                    )}

                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>

                  <div className="pb-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className="text-base font-black text-slate-900 leading-tight">
                        {viewProfileUser.name}
                      </h3>
                      {getVerificationTitle(viewProfileUser.followerCount || 0, viewProfileUser.points || 0) && (
                        <span className="bg-amber-100 border border-amber-350 text-amber-805 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                          ✦ {getVerificationTitle(viewProfileUser.followerCount || 0, viewProfileUser.points || 0)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-600 font-mono mt-0.5 font-bold">
                      {viewProfileUser.role === "business"
                        ? (viewProfileUser.businessName || "Business Owner")
                        : viewProfileUser.role === "consultant"
                          ? (viewProfileUser.consultancyName || "AI Consultant")
                          : "Community Member"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* Publish New Lounge Sticky Note – profile dashboard portal (Business Owner & AI Consultant only) */}
            {viewProfileUser.isOwn && isLoggedIn && (role === "business" || role === "consultant") && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-amber-100/80 pb-3">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    📌 Publish New Lounge Sticky Note
                  </h4>
                  <p className="text-[10.5px] text-slate-500 leading-normal mt-1">
                    Instantly share dynamic cards with the community as text quotes, photo snapshots, or operational data metrics.
                  </p>
                </div>

                {/* Format Selector Tabs */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                  <button type="button" onClick={() => setProfileStickyType("quote")}
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${profileStickyType === "quote" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    ✍️ Quote Card
                  </button>
                  <button type="button" onClick={() => setProfileStickyType("photo")}
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${profileStickyType === "photo" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    📸 Photo Card
                  </button>
                  <button type="button" onClick={() => setProfileStickyType("data")}
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${profileStickyType === "data" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    📊 Data State
                  </button>
                </div>

                {/* Creator Form */}
                <form onSubmit={handlePublishProfileSticky} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Sticky Note Title</Label>
                    <Input
                      placeholder={profileStickyType === "quote" ? "e.g. Daily Motivation Quote" : profileStickyType === "photo" ? "e.g. Courier packaging mock design" : "e.g. Growth marketing metrics audit"}
                      value={profileStickyTitle}
                      onChange={(e) => setProfileStickyTitle(e.target.value)}
                      className="h-8.5 bg-white border-slate-200 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Note Content</Label>
                    <textarea
                      placeholder="Type the details of your card..."
                      rows={3}
                      value={profileStickyContent}
                      onChange={(e) => setProfileStickyContent(e.target.value)}
                      className="w-full text-xs rounded-xl bg-white border border-slate-200 p-2.5 focus:border-amber-500 outline-none resize-none"
                      required
                    />
                  </div>

                  {profileStickyType === "photo" && (
                    <div className="space-y-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Attach Photo Image</Label>
                      <div
                        onClick={() => profileStickyPhotoRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-4 bg-white text-center cursor-pointer transition"
                      >
                        {profileStickyPhoto ? (
                          <div className="relative group max-w-[180px] mx-auto">
                            <img src={profileStickyPhoto} alt="Preview" className="max-h-28 object-cover rounded-lg mx-auto" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[8px] font-bold rounded-lg">Change Photo</div>
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-400">
                            <Camera className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                            <span className="font-bold text-slate-600 block">Choose image file</span>
                            <span>Supports JPG, PNG</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={profileStickyPhotoRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => { if (typeof reader.result === "string") { setProfileStickyPhoto(reader.result); toast.success("Photo loaded!"); } };
                          reader.readAsDataURL(file);
                        }
                      }} accept="image/*" className="hidden" />
                    </div>
                  )}

                  {profileStickyType === "data" && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Before Metric</Label>
                        <Input placeholder="e.g. 15% Return Rate" value={profileStickyBefore} onChange={(e) => setProfileStickyBefore(e.target.value)} className="h-8 bg-white border-slate-200 text-xs" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">After Metric</Label>
                        <Input placeholder="e.g. 48% Return Rate" value={profileStickyAfter} onChange={(e) => setProfileStickyAfter(e.target.value)} className="h-8 bg-white border-slate-200 text-xs" required />
                      </div>
                    </div>
                  )}

                  {/* Pastel Color Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase block">Sticky Card Background Color</Label>
                    <div className="flex gap-3 items-center">
                      {(["yellow", "pink", "blue", "green"] as const).map(color => {
                        const swatchBg = { yellow: "bg-[#FFF9A6]", pink: "bg-[#FFC5D9]", blue: "bg-[#A2E8FF]", green: "bg-[#B2F5B2]" };
                        const swatchLabel = { yellow: "Rice", pink: "Textile", blue: "Mobile", green: "Bakery" };
                        return (
                          <button key={color} type="button" onClick={() => setProfileStickyColor(color)}
                            className={`flex flex-col items-center gap-0.5 group transition-transform ${profileStickyColor === color ? "scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"}`}
                            title={swatchLabel[color]}>
                            <div className={`w-7 h-7 rounded-full border-2 shadow-sm ${swatchBg[color]} ${profileStickyColor === color ? "border-slate-700 ring-2 ring-offset-1 ring-amber-500" : "border-slate-300"}`} />
                            <span className="text-[8px] text-slate-400 font-medium">{swatchLabel[color]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs h-9">
                    Publish Sticky Note
                  </Button>
                </form>
              </div>
            )}

            {/* Live Professional Seminars Workspace (only visible if profile is business owner or consultant) */}
            {(viewProfileUser.role === "business" || viewProfileUser.role === "consultant") && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Video className="h-4.5 w-4.5 text-amber-500" /> Live Professional Seminars
                    </h4>
                    <p className="text-[10.5px] text-slate-500 leading-normal mt-0.5">
                      All seminars are conducted as a 30-minute live video session held on our platform.
                    </p>
                  </div>

                  {viewProfileUser.isOwn && (
                    <Button
                      onClick={() => setShowProfileSemCreator(!showProfileSemCreator)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs px-3 h-8.5 shadow-sm flex items-center gap-1"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Host Seminar
                    </Button>
                  )}
                </div>

                {/* Seminar Creator Form (Host Only) */}
                {viewProfileUser.isOwn && showProfileSemCreator && (
                  <form onSubmit={handlePublishProfileSeminar} className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4 text-xs animate-in slide-in-from-top-1.5 duration-200">
                    <div className="border-b border-slate-150 pb-2">
                      <h5 className="font-extrabold text-xs text-slate-800">Schedule New Masterclass Seminar</h5>
                      <p className="text-[10px] text-slate-455 mt-0.5">Fill in the details to list your seminar on the platform and notify followers.</p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">Seminar Subject / Topic</Label>
                      <Input
                        placeholder="e.g. Raising B2B Debt Capital"
                        value={profSemSubject}
                        onChange={(e) => setProfSemSubject(e.target.value)}
                        className="h-8.5 bg-white border-slate-200 text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Date & Time</Label>
                        <Input
                          type="datetime-local"
                          min={minDateTime}
                          value={profSemDateTime}
                          onChange={(e) => setProfSemDateTime(e.target.value)}
                          className="h-8.5 bg-white border-slate-200 text-xs cursor-pointer"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Ticket Fee</Label>
                        <Input
                          placeholder="e.g. PKR 3,500"
                          value={profSemFee}
                          onChange={(e) => setProfSemFee(e.target.value)}
                          className="h-8.5 bg-white border-slate-200 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">Seminar Outline & Description</Label>
                      <textarea
                        placeholder="Detail the key learning outcomes, agenda, and requirements..."
                        rows={3}
                        value={profSemOutline}
                        onChange={(e) => setProfSemOutline(e.target.value)}
                        className="w-full text-xs rounded-xl bg-white border border-slate-200 p-2.5 focus:border-amber-500 outline-none"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-slate-100 p-2.5 rounded-xl">
                      <input
                        type="checkbox"
                        id="tagFollowersCheckbox"
                        checked={profSemTagFollowers}
                        onChange={(e) => setProfSemTagFollowers(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="tagFollowersCheckbox" className="text-[11px] font-semibold text-slate-700 cursor-pointer select-none flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" /> Tag all followers ({followerCount.toLocaleString()} followers)
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2">
                      <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-200/40 px-2.5 py-1.5 rounded-lg max-w-[60%] leading-normal">
                        ℹ️ This will be scheduled as a 30-minute live video session.
                      </span>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowProfileSemCreator(false)}
                          className="text-xs h-9 rounded-xl border-slate-200"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs h-9 rounded-xl px-4"
                        >
                          Publish & Schedule Seminar
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Hosted Seminars List */}
                <div className="space-y-4">
                  {seminars.filter(sem => sem.hostName.toLowerCase().trim() === viewProfileUser.name.toLowerCase().trim()).length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                      No live seminars scheduled by this user yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {seminars
                        .filter(sem => sem.hostName.toLowerCase().trim() === viewProfileUser.name.toLowerCase().trim())
                        .map(sem => {
                          const isOwnSem = viewProfileUser.isOwn;
                          const isReg = currentUser.registeredSeminars?.includes(sem.id);
                          return (
                            <div key={sem.id} className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/45 space-y-3.5 hover:border-amber-250 transition-all shadow-xs flex flex-col justify-between">
                              <div className="space-y-2.5">
                                <div className="flex justify-between items-start">
                                  <span className="text-[8.5px] bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                                    MASTERCLASS
                                  </span>
                                  <span className="text-[8.5px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold uppercase flex items-center gap-0.5">
                                    ⏱ 30-MIN SESSION
                                  </span>
                                </div>
                                
                                <h5 className="text-xs font-black text-slate-900 leading-snug">{sem.subject}</h5>
                                
                                <div className="text-[10px] space-y-1.5 text-slate-600 bg-white border border-slate-150/55 p-2.5 rounded-xl">
                                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" /> <span className="font-semibold text-slate-800">Time:</span> {sem.dateTime}</div>
                                  <p className="text-[9.5px] italic leading-relaxed text-slate-500 pt-0.5">"{sem.outline}"</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-200/60 pt-3 mt-1">
                                <span className="text-xs font-black text-amber-600">{sem.fee} ticket</span>

                                {isOwnSem ? (
                                  <Button
                                    onClick={() => handleLaunchMeeting(sem.subject)}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] h-8 rounded-lg px-3 flex items-center gap-1 shadow-xs"
                                  >
                                    <Video className="h-3.5 w-3.5" /> Launch Meeting
                                  </Button>
                                ) : isReg ? (
                                  <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-full">
                                      ✓ Registered (Access Granted)
                                    </span>
                                    <Button
                                      onClick={() => handleJoinMeeting(sem.subject)}
                                      className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] h-7 rounded-lg px-2.5 flex items-center gap-1 shadow-xs"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Join Session
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      if (!isLoggedIn) {
                                        setShowAuthModal(true);
                                        return;
                                      }
                                      registerForSeminar(sem.id);
                                      toast.success(`Registered successfully! Access ticket acquired for ${sem.subject}.`);
                                    }}
                                    className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] h-8 rounded-lg px-3 transition shadow-xs"
                                  >
                                    Pay Fee & Join 30-Min Video Session
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content History Grid Container */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                User Content History Grid
              </h4>

              {/* Profile sub-tabs: Published cards vs comments */}
              <div className="flex gap-4 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setProfileTab("posts")}
                  className={`text-xs font-bold pb-1 transition border-b-2 ${profileTab === "posts" ? "border-amber-500 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-605"
                    }`}
                >
                  Published Cards ({profilePosts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setProfileTab("comments")}
                  className={`text-xs font-bold pb-1 transition border-b-2 ${profileTab === "comments" ? "border-amber-500 text-slate-900" : "border-transparent text-slate-400 hover:text-slate-605"
                    }`}
                >
                  Commentary Logs ({profileComments.length})
                </button>
              </div>

              {profileTab === "posts" ? (
                <div className="space-y-4">
                  {profilePosts.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-xl">No published cards found.</p>
                  ) : (
                    profilePosts.map(post => {
                      const isLiked = likedPosts.includes(post.id);
                      let cardStyle = "bg-slate-50/50 border-slate-200";

                      // Pastel logic for sticky notes in profile history
                      if (post.category === "Insight Board") {
                        const colorClasses = {
                          yellow: "bg-[#fef9c3] border-yellow-300",
                          blue: "bg-[#dbeafe] border-blue-300",
                          green: "bg-[#dcfce7] border-green-300"
                        };
                        const colorKey = (post.avatarColor === "yellow" || post.avatarColor === "blue" || post.avatarColor === "green") ? post.avatarColor : "yellow";
                        cardStyle = colorClasses[colorKey];
                      }

                      return (
                        <div key={post.id} className={`border rounded-xl p-4 space-y-3 ${cardStyle}`}>
                          <div className="flex justify-between items-start">
                            <span className="text-[8.5px] bg-slate-900/10 border border-slate-300/30 text-slate-700 px-2 py-0.5 rounded uppercase font-mono font-bold">
                              {post.category || "General"}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">{post.time}</span>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 leading-snug">{post.title}</h5>
                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{post.content}</p>
                            {post.proofAttachment && (
                              <div className="mt-3">
                                {post.proofAttachment.startsWith("data:image") ? (
                                  <img
                                    src={post.proofAttachment}
                                    alt="Attached dynamic snapshot illustration"
                                    className="w-full max-h-48 object-cover rounded-xl border border-slate-200/60 shadow-xs"
                                  />
                                ) : (
                                  <div className="border border-dashed border-slate-200 bg-white/70 rounded-xl p-2 flex items-center justify-between text-[9px] text-slate-600">
                                    <span>📁 Attachment:</span>
                                    <span className="font-mono text-amber-600 bg-white px-1.5 py-0.5 rounded border border-slate-150">document.pdf</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Rendering metrics if blueprint */}
                          {post.isMarketingBlueprint && (post.beforeMetrics || post.afterMetrics) && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/60 border border-slate-100 rounded-lg p-2">
                              <div>
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Before</span>
                                <span className="font-semibold text-slate-600">{post.beforeMetrics}</span>
                              </div>
                              <div>
                                <span className="text-[8px] uppercase tracking-wider text-amber-700 block font-bold">After</span>
                                <span className="font-semibold text-amber-700">{post.afterMetrics}</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold border-t border-slate-950/5 pt-2">
                            <button type="button" onClick={() => toggleLikePost(post.id)} className={`flex items-center gap-1 ${isLiked ? "text-amber-600" : ""}`}>
                              <Heart className="h-3 w-3" /> {post.votes} Likes
                            </button>
                            <span>•</span>
                            <span>{post.comments.length} Comments</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {profileComments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 text-center border border-dashed rounded-xl">No comments recorded.</p>
                  ) : (
                    profileComments.map((comment, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                          <span className="font-bold text-slate-700 truncate max-w-[200px]">Commented on: "{comment.postTitle}"</span>
                          <span>{comment.time}</span>
                        </div>
                        <p className="text-xs text-slate-655 italic">
                          "{comment.content}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Public Profile feedback critique submit form for OTHER users */}
            {!viewProfileUser.isOwn && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">
                  Suggest Improvement (Anonymous Vault Critique)
                </h4>
                <p className="text-[10.5px] text-slate-500 leading-normal">
                  Anonymously suggest business or structural critiques. Feedback remains privately locked inside their vault.
                </p>
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Provide constructive feedback anonymously..."
                    value={improvementText}
                    onChange={(e) => setImprovementText(e.target.value)}
                    className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 p-2.5 outline-none focus:border-red-400 transition"
                  />
                  <Button
                    onClick={() => {
                      if (!isLoggedIn) {
                        toast.error("Please login to submit feedback.");
                        return;
                      }
                      if (!improvementText.trim()) return;
                      addWeaknessFeedback(improvementText.trim());
                      setImprovementText("");
                      toast.success("Critique submitted anonymously to their private Weakness Vault!");
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs h-8.5 cursor-pointer"
                  >
                    Submit Anonymous Feedback
                  </Button>
                </div>
              </div>
            )}
          </main>
        ) : (
          <main className="space-y-6">

            {/* ── STICKY NOTE PUBLISHER (Location A: Main Lounge Feed) ── */}
            {isUserAllowedToPost && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="border-b border-amber-100/80 pb-3">
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    📌 Publish New Lounge Sticky Note
                  </h4>
                  <p className="text-[10.5px] text-slate-500 leading-normal mt-1">
                    Instantly share dynamic cards with the community as text quotes, photo snapshots, or operational data metrics.
                  </p>
                </div>

                {/* Format Selector Tabs */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                  <button type="button" onClick={() => setProfileStickyType("quote")}
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${profileStickyType === "quote" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    ✍️ Quote Card
                  </button>
                  <button type="button" onClick={() => setProfileStickyType("photo")}
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${profileStickyType === "photo" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    📸 Photo Card
                  </button>
                  <button type="button" onClick={() => setProfileStickyType("data")}
                    className={`py-1.5 text-[10px] font-extrabold rounded-lg transition-all ${profileStickyType === "data" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
                    📊 Data State
                  </button>
                </div>

                {/* Creator Form */}
                <form onSubmit={handlePublishProfileSticky} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Sticky Note Title</Label>
                    <Input
                      placeholder={profileStickyType === "quote" ? "e.g. Daily Motivation Quote" : profileStickyType === "photo" ? "e.g. Courier packaging mock design" : "e.g. Growth marketing metrics audit"}
                      value={profileStickyTitle}
                      onChange={(e) => setProfileStickyTitle(e.target.value)}
                      className="h-8.5 bg-slate-50 border-slate-200 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Note Content</Label>
                    <textarea
                      placeholder="Type the details of your card..."
                      rows={3}
                      value={profileStickyContent}
                      onChange={(e) => setProfileStickyContent(e.target.value)}
                      className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 p-2.5 focus:border-amber-500 outline-none resize-none"
                      required
                    />
                  </div>

                  {profileStickyType === "photo" && (
                    <div className="space-y-2 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Attach Photo Image</Label>
                      <div
                        onClick={() => profileStickyPhotoRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl p-4 bg-white text-center cursor-pointer transition"
                      >
                        {profileStickyPhoto ? (
                          <div className="relative group max-w-[180px] mx-auto">
                            <img src={profileStickyPhoto} alt="Preview" className="max-h-28 object-cover rounded-lg mx-auto" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[8px] font-bold rounded-lg">Change Photo</div>
                          </div>
                        ) : (
                          <div className="text-[9px] text-slate-400">
                            <Camera className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                            <span className="font-bold text-slate-600 block">Choose image file</span>
                            <span>Supports JPG, PNG</span>
                          </div>
                        )}
                      </div>
                      <input type="file" ref={profileStickyPhotoRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => { if (typeof reader.result === "string") { setProfileStickyPhoto(reader.result); toast.success("Photo loaded!"); } };
                          reader.readAsDataURL(file);
                        }
                      }} accept="image/*" className="hidden" />
                    </div>
                  )}

                  {profileStickyType === "data" && (
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Before Metric</Label>
                        <Input placeholder="e.g. 15% Return Rate" value={profileStickyBefore} onChange={(e) => setProfileStickyBefore(e.target.value)} className="h-8 bg-white border-slate-200 text-xs" required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">After Metric</Label>
                        <Input placeholder="e.g. 48% Return Rate" value={profileStickyAfter} onChange={(e) => setProfileStickyAfter(e.target.value)} className="h-8 bg-white border-slate-200 text-xs" required />
                      </div>
                    </div>
                  )}

                  {/* Pastel Color Picker */}
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase block">Sticky Card Background Color</Label>
                    <div className="flex gap-3 items-center">
                      {(["yellow", "pink", "blue", "green"] as const).map(color => {
                        const swatchBg = { yellow: "bg-[#FFF9A6]", pink: "bg-[#FFC5D9]", blue: "bg-[#A2E8FF]", green: "bg-[#B2F5B2]" };
                        const swatchLabel = { yellow: "Rice", pink: "Textile", blue: "Mobile", green: "Bakery" };
                        return (
                          <button key={color} type="button" onClick={() => setProfileStickyColor(color)}
                            className={`flex flex-col items-center gap-0.5 group transition-transform ${profileStickyColor === color ? "scale-110" : "opacity-70 hover:opacity-100 hover:scale-105"}`}
                            title={swatchLabel[color]}>
                            <div className={`w-7 h-7 rounded-full border-2 shadow-sm ${swatchBg[color]} ${profileStickyColor === color ? "border-slate-700 ring-2 ring-offset-1 ring-amber-500" : "border-slate-300"}`} />
                            <span className="text-[8px] text-slate-400 font-medium">{swatchLabel[color]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs h-9">
                    Publish Sticky Note
                  </Button>
                </form>
              </div>
            )}

            {/* TIMELINE VIEW LOOP */}
            <div className="space-y-6">
              {visiblePosts.length === 0 ? (
                <div className="py-12 border border-dashed border-slate-200 rounded-2xl bg-white text-center text-xs text-slate-400">
                  No lounge cards matching this tab.
                </div>
              ) : (
                visiblePosts.map(post => {
                  const isSaved = savedPosts.includes(post.id);
                  const isFollowing = followedUsers.includes(post.author);
                  const isLiked = likedPosts.includes(post.id);
                  const isCommentsExpanded = !!expandedComments[post.id];

                  // Determine sticky card backgrounds (all 4 pastel keys)
                  let cardStyle = "bg-white border-slate-200";
                  const pastelColors = ["yellow", "blue", "green", "pink"];
                  if (post.category === "Insight Board" || pastelColors.includes(post.avatarColor)) {
                    const colorKey = pastelColors.includes(post.avatarColor) ? post.avatarColor : "yellow";
                    cardStyle = colorClasses[colorKey as "yellow" | "blue" | "green" | "pink"];
                  }

                  if (post.isPrediction) {
                    return (
                      <PredictionCard
                        key={post.id}
                        post={post}
                        onVerify={verifyPrediction}
                        isLoggedIn={isLoggedIn}
                      />
                    );
                  }

                  return (
                    <article
                      key={post.id}
                      className={`border shadow-[0_6px_24px_-4px_rgba(0,0,0,0.14),0_2px_8px_-2px_rgba(0,0,0,0.08)] rounded-2xl p-5 pt-7 space-y-3.5 transition hover:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.18)] hover:-translate-y-1 relative group ${cardStyle}`}
                    >
                      {/* Realistic tape graphic — centered at top edge */}
                      <div
                        className="absolute left-1/2 bg-slate-400/25 border border-slate-400/15 backdrop-blur-sm"
                        style={{
                          top: "-10px",
                          transform: "translateX(-50%) rotate(-0.8deg)",
                          width: "72px",
                          height: "18px",
                          borderRadius: "2px",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.35)",
                          background: "linear-gradient(135deg, rgba(200,200,200,0.35) 0%, rgba(220,220,220,0.5) 50%, rgba(200,200,200,0.35) 100%)"
                        }}
                      />

                      {/* Top: Niche Tag bold label at top-left */}
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-slate-700 bg-slate-900/8 border border-slate-900/10 px-2 py-0.5 rounded uppercase tracking-widest">
                          {post.category || "Insight Board"}
                        </span>
                        <span className="text-[9px] text-slate-400/70 font-mono">{post.time}</span>
                      </div>

                      {/* Main body content — handwritten cursive style */}
                      <div className="space-y-1.5 min-h-[60px]">
                        <h4 className="text-[11.5px] font-black text-slate-900 leading-snug font-sans">{post.title}</h4>
                        <p className="text-[14px] text-slate-750 leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Caveat', 'Kalam', 'Dancing Script', 'Segoe Print', cursive", letterSpacing: "0.01em" }}>{post.content}</p>
                        
                        {post.proofAttachment && (
                          <div className="mt-3">
                            {post.proofAttachment.startsWith("data:image") ? (
                              <img
                                src={post.proofAttachment}
                                alt="Attached dynamic snapshot illustration"
                                className="w-full max-h-60 object-cover rounded-xl border border-slate-200/60 shadow-xs"
                              />
                            ) : (
                              <div className="border border-dashed border-slate-200 bg-white/70 rounded-xl p-2.5 flex items-center justify-between text-[10px] text-slate-650">
                                <span className="flex items-center gap-1.5 font-sans">📁 Attachment:</span>
                                <span className="font-mono text-amber-600 bg-white px-2 py-0.5 rounded border border-slate-150">document.pdf</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Marketing metrics Before/After display */}
                      {post.isMarketingBlueprint && (post.beforeMetrics || post.afterMetrics) && (
                        <div className="grid grid-cols-2 gap-2 bg-white/70 border border-slate-205 rounded-xl p-3 text-center font-sans">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-[8.5px] uppercase tracking-wider text-slate-450 block font-bold">Before metrics</span>
                            <span className="text-xs font-bold text-slate-600">{post.beforeMetrics}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-200/40">
                            <span className="text-[8.5px] uppercase tracking-wider text-amber-700 block font-bold">After metrics</span>
                            <span className="text-xs font-bold text-amber-700">{post.afterMetrics}</span>
                          </div>
                        </div>
                      )}

                      {/* B2B Packaging quotes matcher */}
                      {post.isPackagingReq && (
                        <div className="space-y-3 bg-slate-50/70 border border-slate-205 rounded-xl p-3.5 font-sans">
                          <h5 className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-750 flex items-center justify-between">
                            <span>Packaging supplier quotes</span>
                            <span className="text-[8px] bg-white border border-slate-200 text-slate-450 px-1.5 py-0.2 rounded font-mono">B2B matching</span>
                          </h5>

                          {post.packagingQuotes && post.packagingQuotes.length > 0 ? (
                            <div className="space-y-2">
                              {post.packagingQuotes.map(quote => (
                                <div key={quote.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs shadow-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center font-bold text-[9px] uppercase">
                                      {quote.supplierName.charAt(0)}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-805 block">{quote.supplierName}</span>
                                      <span className="text-[9px] text-slate-400">{quote.timeline}</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-extrabold text-amber-600 block">{quote.price}</span>
                                    {quote.accepted ? (
                                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block mt-1 animate-bounce">
                                        [ Order Placed ✓ ]
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (!isLoggedIn) {
                                            setShowAuthModal(true);
                                            return;
                                          }
                                          acceptQuote(post.id, quote.id);
                                          toast.success("Quote accepted successfully! [ Order Placed ✓ ] (+5 Platform Points)");
                                        }}
                                        className="text-[9.5px] font-bold text-indigo-600 hover:underline cursor-pointer block mt-1"
                                      >
                                        Accept Quote
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No supplier responses yet.</p>
                          )}
                        </div>
                      )}

                      {/* Problems Urgency panels */}
                      {post.isProblem && (
                        <div className="space-y-3 font-sans">
                          {post.nicheOwnersNotified && post.nicheOwnersNotified.length > 0 && (
                            <div className="bg-rose-500/5 border border-rose-250/30 rounded-xl p-3">
                              <span className="text-[9px] uppercase tracking-wider text-rose-800 font-extrabold block mb-1">
                                📨 Experts Notified
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {post.nicheOwnersNotified.map(expert => (
                                  <span key={expert} className="text-[9px] font-semibold bg-white border border-rose-200/50 text-rose-700 px-2 py-0.5 rounded-full shadow-xs">
                                    {expert}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {post.aiResolutionMock && (
                            <div className="bg-[#fcfaf5] border border-amber-200/80 rounded-xl p-3.5 space-y-1">
                              <div className="flex items-center gap-1 text-amber-700 font-bold text-[9px] uppercase tracking-wider">
                                <Bot className="h-3.5 w-3.5" /> AI Suggestion resolution
                              </div>
                              <p className="text-[10.5px] text-slate-655 leading-relaxed italic">
                                "{post.aiResolutionMock}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bottom metadata footer — Author name left | Views + Likes right */}
                      <div className="flex items-center justify-between border-t border-slate-900/8 pt-2.5 mt-1 text-[10px] text-slate-500 font-sans">
                        <div className="flex items-center gap-1.5">
                          <span
                            onClick={() => handleAuthorClick(post)}
                            className="font-extrabold text-slate-800 hover:text-amber-700 hover:underline cursor-pointer transition"
                          >{post.author}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-amber-600 font-semibold capitalize">{getUserSubtext(post.author, post.role)}</span>
                        </div>
                        <div className="flex items-center gap-2.5 font-semibold">
                          <span className="flex items-center gap-0.5 text-slate-400">
                            <Globe className="h-2.5 w-2.5" /> {(post.votes * 4 + 18)}
                          </span>
                          <button
                            onClick={() => toggleLikePost(post.id)}
                            className={`flex items-center gap-0.5 transition ${isLiked ? "text-rose-500 font-bold" : "text-slate-400 hover:text-rose-400"}`}
                          >
                            <Heart className={`h-2.5 w-2.5 ${isLiked ? "fill-rose-500" : ""}`} /> {post.votes}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </main>
        )}

        {/* RIGHT PANEL: context-aware — Seminars (main feed) | Milestones (profile view) */}
        <aside className="space-y-6">
          {viewProfileUser ? (
            /* Profile view: Verification Titles Dashboard */
            <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-xs text-slate-900 leading-tight">Verification Titles Dashboard</h3>
                <p className="text-[9px] text-slate-400 uppercase font-mono tracking-tight font-bold">Dual-Condition Milestones</p>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                {/* Bronze Title */}
                <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Bronze Title</span>
                    <span className={viewProfileUser.followerCount >= 1000 && (viewProfileUser.points || 0) >= 500 ? "text-emerald-600 font-extrabold" : "text-slate-400"}>
                      {viewProfileUser.followerCount >= 1000 && (viewProfileUser.points || 0) >= 500 ? "[✓] Achieved" : "[ ] Locked"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5 mt-1">
                    <div>• Followers target: 1,000 (Current: {viewProfileUser.followerCount?.toLocaleString()})</div>
                    <div>• Strategy Points target: 500 (Current: {viewProfileUser.points || 0})</div>
                  </div>
                </div>

                {/* Silver Title */}
                <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Silver Title</span>
                    <span className={viewProfileUser.followerCount >= 10000 && (viewProfileUser.points || 0) >= 1000 ? "text-emerald-600 font-extrabold" : "text-slate-400"}>
                      {viewProfileUser.followerCount >= 10000 && (viewProfileUser.points || 0) >= 1000 ? "[✓] Achieved" : "[ ] Locked"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5 mt-1">
                    <div>• Followers target: 10,000 (Current: {viewProfileUser.followerCount?.toLocaleString()})</div>
                    <div>• Strategy Points target: 1,000 (Current: {viewProfileUser.points || 0})</div>
                  </div>
                </div>

                {/* Gold Title */}
                <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Gold Title</span>
                    <span className={viewProfileUser.followerCount >= 50000 && (viewProfileUser.points || 0) >= 5000 ? "text-emerald-600 font-extrabold" : "text-slate-400"}>
                      {viewProfileUser.followerCount >= 50000 && (viewProfileUser.points || 0) >= 5000 ? "[✓] Achieved" : "[ ] Locked"}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 space-y-0.5 mt-1">
                    <div>• Followers target: 50,000 (Current: {viewProfileUser.followerCount?.toLocaleString()})</div>
                    <div>• Strategy Points target: 5,000 (Current: {viewProfileUser.points || 0})</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] text-slate-500 leading-relaxed text-justify">
                  "When you achieve these criteria, you automatically receive this verified title status displayed permanently on your workspace profile. Points are programmatically distributed to creators when their posted platform strategies, future predictions, and operational solutions successfully scale up in positive community accuracy voting."
                </p>
              </div>
            </div>
          ) : (
            /* Main feed view: Other users' seminars only — NO creation controls */
            (() => {
              const currentUserId = currentUser.name.trim().toLowerCase().replace(/\s+/g, "_");
              const otherSeminars = seminars.filter(sem => sem.authorId !== currentUserId);
              return (
                <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-xs text-slate-900 leading-tight">Live Professional Seminars</h3>
                    <p className="text-[9px] text-slate-400 uppercase font-mono tracking-tight font-bold">Community Masterclasses</p>
                  </div>

                  {otherSeminars.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-6 border border-dashed rounded-xl">
                      No upcoming seminars from other hosts yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {otherSeminars.map((sem) => {
                        const isRegistered = currentUser.registeredSeminars?.includes(sem.id);
                        return (
                          <div key={sem.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 hover:border-amber-300 transition-all">
                            <div className="space-y-1">
                              <span className="text-[8px] bg-amber-50 border border-amber-200/50 text-amber-700 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                MASTERCLASS
                              </span>
                              <h4 className="text-xs font-black text-slate-900 leading-snug pt-0.5">{sem.subject}</h4>
                            </div>

                            <div className="text-[10px] space-y-1 text-slate-600">
                              <div><strong className="text-slate-800">Host:</strong> {sem.hostName} ({sem.hostRoleText})</div>
                              <div className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" /><strong className="text-slate-800">Time:</strong> {sem.dateTime}</div>
                              <p className="text-[9.5px] italic leading-relaxed pt-0.5">"{sem.outline}"</p>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2.5">
                              <span className="text-xs font-black text-amber-600">{sem.fee} ticket</span>
                              {isRegistered ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-xl flex items-center gap-0.5">
                                  ✓ Registered
                                </span>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (!isLoggedIn) { setShowAuthModal(true); return; }
                                    registerForSeminar(sem.id);
                                    toast.success(`Registered! Access ticket acquired for "${sem.subject}".`);
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-sm transition"
                                >
                                  Pay Fee & Join Masterclass
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </aside>

      </div>{/* end 3-column grid */}

      {/* DYNAMIC CONDITIONAL AUTHMEDAL SIGNUP WIZARD */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[95vh]">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-1 mb-5">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 mb-1">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Authenticate Profile</h3>
              <p className="text-[11px] text-slate-500">Signup to post market predictions or register B2B masterclasses.</p>
            </div>

            <AuthModalWizard onComplete={handleAuthComplete} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Signup Wizard Component with dynamic tabs ────────────────────────────────
function AuthModalWizard({ onComplete }: { onComplete: (user: string, role: Role, advancedFields: any) => void }) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("signup");

  // Sign Up parameters
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupRole, setSignupRole] = useState<Role>("guest");

  // Conditional Fields
  const [bizName, setBizName] = useState("");
  const [bizWebsite, setBizWebsite] = useState("");
  const [firmName, setFirmName] = useState("");
  const [nicheExpertise, setNicheExpertise] = useState("Growth Strategy");
  const [certKey, setCertKey] = useState("");

  // Login parameters
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword) {
      toast.error("Please fill in all standard credentials.");
      return;
    }
    if (signupPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      toast.error("Passwords do not match.");
      return;
    }

    const advancedFields: any = {
      email: signupEmail,
    };

    if (signupRole === "business") {
      if (!bizName.trim() || !bizWebsite.trim()) {
        toast.error("Please fill in Business Name and Website Link.");
        return;
      }
      advancedFields.businessName = bizName;
      advancedFields.businessWebsite = bizWebsite;
    } else if (signupRole === "consultant") {
      if (!firmName.trim() || !certKey.trim()) {
        toast.error("Please fill in Consultancy Firm and Certification Key.");
        return;
      }
      advancedFields.consultancyName = firmName;
      advancedFields.expertiseNiche = nicheExpertise;
      advancedFields.certificationKey = certKey;
    }

    // Persist mock accounts
    const cleanKey = signupName.trim().toLowerCase().replace(/\s+/g, "_");
    const accounts = JSON.parse(localStorage.getItem("smartbiz_wizard_accounts") || "{}");
    accounts[cleanKey] = {
      name: signupName.trim(),
      password: signupPassword,
      role: signupRole,
      advancedFields
    };
    localStorage.setItem("smartbiz_wizard_accounts", JSON.stringify(accounts));

    onComplete(signupName.trim(), signupRole, advancedFields);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginName.trim() || !loginPassword) {
      toast.error("Please enter credentials.");
      return;
    }

    const cleanKey = loginName.trim().toLowerCase().replace(/\s+/g, "_");
    const accounts = JSON.parse(localStorage.getItem("smartbiz_wizard_accounts") || "{}");
    const matched = accounts[cleanKey];

    if (!matched) {
      toast.error("No wizard account found with this name. Please Sign Up first.");
      return;
    }
    if (matched.password !== loginPassword) {
      toast.error("Incorrect password.");
      return;
    }

    onComplete(matched.name, matched.role, matched.advancedFields);
  };

  return (
    <div className="space-y-4 overflow-y-auto max-h-[70vh] pr-1">

      {/* Wizard tab selections */}
      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={`py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("signup")}
          className={`py-1.5 text-xs font-bold rounded-lg transition ${activeTab === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
        >
          Sign Up
        </button>
      </div>

      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Username / Name</Label>
            <Input
              placeholder="e.g. Sarah Sterling"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              className="h-8.5 bg-slate-50 text-xs"
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-500 uppercase">Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="h-8.5 bg-slate-50 text-xs"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-9.5 rounded-xl">
            Login
          </Button>
        </form>
      )}

      {activeTab === "signup" && (
        <form onSubmit={handleSignup} className="space-y-4 text-xs">

          {/* Base inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Username</Label>
              <Input placeholder="e.g. Zain Malik" value={signupName} onChange={(e) => setSignupName(e.target.value)} className="h-8.5 bg-slate-50 text-xs" required />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</Label>
              <Input type="email" placeholder="zain@domain.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="h-8.5 bg-slate-50 text-xs" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Password</Label>
              <Input type="password" placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="h-8.5 bg-slate-50 text-xs" required />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-500 uppercase">Confirm Password</Label>
              <Input type="password" placeholder="••••••••" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} className="h-8.5 bg-slate-50 text-xs" required />
            </div>
          </div>

          {/* Account Type Selector cards */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Account Type Selector</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSignupRole("guest")}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${signupRole === "guest" ? "border-amber-500 bg-amber-500/5 font-bold" : "border-slate-200 hover:border-slate-350 bg-white"
                  }`}
              >
                <User className="h-4.5 w-4.5 text-slate-600" />
                <span className="text-[9.5px]">Normal Member</span>
              </button>

              <button
                type="button"
                onClick={() => setSignupRole("business")}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${signupRole === "business" ? "border-amber-500 bg-amber-500/5 font-bold" : "border-slate-200 hover:border-slate-350 bg-white"
                  }`}
              >
                <Briefcase className="h-4.5 w-4.5 text-slate-600" />
                <span className="text-[9.5px]">Business Owner</span>
              </button>

              <button
                type="button"
                onClick={() => setSignupRole("consultant")}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${signupRole === "consultant" ? "border-amber-500 bg-amber-500/5 font-bold" : "border-slate-200 hover:border-slate-350 bg-white"
                  }`}
              >
                <Bot className="h-4.5 w-4.5 text-slate-600" />
                <span className="text-[9.5px]">AI Consultant</span>
              </button>
            </div>
          </div>

          {/* Conditional Input Fields */}
          {signupRole === "business" && (
            <div className="bg-amber-500/5 border border-amber-250/50 rounded-xl p-4.5 space-y-3 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Business Owner parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Business Name</Label>
                  <Input placeholder="e.g. Cakes Hub" value={bizName} onChange={(e) => setBizName(e.target.value)} className="h-8.5 bg-white text-xs" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Website Link</Label>
                  <Input placeholder="www.cakeshub.com" value={bizWebsite} onChange={(e) => setBizWebsite(e.target.value)} className="h-8.5 bg-white text-xs" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Verification Proof Document Upload</Label>
                <div className="border border-dashed border-amber-200 bg-white rounded-lg p-2.5 text-center text-[9px] text-slate-400">
                  📄 Click to drop registration certificate / CNIC front
                </div>
              </div>
            </div>
          )}

          {signupRole === "consultant" && (
            <div className="bg-amber-500/5 border border-amber-250/50 rounded-xl p-4.5 space-y-3 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">AI Consultant parameters</span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Consultancy Firm Name</Label>
                  <Input placeholder="e.g. Alpha Growth Advisors" value={firmName} onChange={(e) => setFirmName(e.target.value)} className="h-8.5 bg-white text-xs" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Expertise Niche</Label>
                  <select
                    value={nicheExpertise}
                    onChange={(e) => setNicheExpertise(e.target.value)}
                    className="w-full h-8.5 bg-white border border-slate-200 rounded-lg text-xs px-2 focus:outline-none"
                  >
                    <option value="Growth Strategy">Growth Strategy</option>
                    <option value="Logistics & Supply">Logistics & Supply</option>
                    <option value="Marketing & Brand">Marketing & Brand</option>
                    <option value="Corporate Compliance">Corporate Compliance</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Certification key / Upload</Label>
                <Input placeholder="e.g. CERT-B2B-1094-PK" value={certKey} onChange={(e) => setCertKey(e.target.value)} className="h-8.5 bg-white text-xs font-mono" required />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold h-9.5 rounded-xl">
            Create Account & Access Lounge
          </Button>

        </form>
      )}

    </div>
  );
}

// Subcomponent: Sticky Note Card representation for predictions
function PredictionCard({
  post,
  onVerify,
  isLoggedIn
}: {
  post: CommunityPost;
  onVerify: (id: string, isCorrect: boolean) => void;
  isLoggedIn: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showVerifyOptions, setShowVerifyOptions] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiry = post.predictionExpiryTime || (Date.now() + 45000);
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    calculateTimeLeft();
    const interval = setInterval(() => {
      const expiry = post.predictionExpiryTime || (Date.now() + 45000);
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [post.predictionExpiryTime]);

  // Randomize or select background color for sticky notes
  const colorClasses = {
    yellow: "bg-[#fef9c3] border-yellow-300",
    blue: "bg-[#dbeafe] border-blue-300",
    green: "bg-[#dcfce7] border-green-300"
  };

  const colorKey = (post.avatarColor === "yellow" || post.avatarColor === "blue" || post.avatarColor === "green") ? post.avatarColor : "yellow";
  const cardStyle = colorClasses[colorKey];

  return (
    <div className={`border shadow-sm rounded-2xl p-5 relative space-y-3 transition hover:shadow-md transform rotate-[-0.5deg] ${cardStyle}`}>
      {/* Tape style overlay */}
      <div className="absolute top-[-9px] left-1/3 transform -translate-x-1/2 w-24 h-4.5 bg-yellow-300/40 border border-yellow-300/50 shadow-xs" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-900/10 flex items-center justify-center font-bold text-xs text-slate-700">
            {post.author.replace("u/", "").charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-805 block">{post.author}</span>
            <span className="text-[8px] text-slate-450 block font-medium">Verified Prediction Account</span>
          </div>
        </div>

        {timeLeft > 0 ? (
          <span className="bg-amber-500/10 border border-amber-500/35 text-amber-700 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold animate-pulse">
            {timeLeft}s left
          </span>
        ) : (
          <span className="bg-rose-500/10 border border-rose-500/35 text-rose-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold">
            Expired
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <h4 className="text-xs font-bold text-slate-900">{post.title}</h4>
        <p className="text-xs text-slate-655 leading-relaxed">{post.content}</p>
      </div>

      {/* Proof Attachment slot */}
      {post.proofAttachment ? (
        <div className="mt-2">
          {post.proofAttachment.startsWith("data:image") ? (
            <img
              src={post.proofAttachment}
              alt="Attached proof"
              className="w-full max-h-40 object-cover rounded-xl border border-slate-200/50 shadow-xs"
            />
          ) : (
            <div className="border border-dashed border-amber-250 bg-white/60 rounded-xl p-2.5 flex items-center justify-between text-[10px] text-slate-500">
              <span> Proof Attachment:</span>
              <span className="text-[9px] font-mono text-amber-600 bg-white px-2 py-0.2 rounded border border-amber-200">predictions_ledger.pdf</span>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-amber-250 bg-white/60 rounded-xl p-2.5 flex items-center justify-between text-[10px] text-slate-500">
          <span> Proof Attachment:</span>
          <span className="text-[9px] font-mono text-amber-600 bg-white px-2 py-0.2 rounded border border-amber-200">predictions_ledger.pdf</span>
        </div>
      )}

      {post.predictionStatus === "active" && timeLeft <= 0 && (
        <div className="pt-1">
          {!showVerifyOptions ? (
            <Button
              onClick={() => {
                if (!isLoggedIn) {
                  toast.error("Please login to verify predictions.");
                  return;
                }
                setShowVerifyOptions(true);
              }}
              size="sm"
              className="w-full bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold rounded-xl h-8.5"
            >
              Verify Prediction
            </Button>
          ) : (
            <div className="flex gap-2 animate-in slide-in-from-top-1.5 duration-200">
              <button
                onClick={() => onVerify(post.id, true)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 rounded-xl transition cursor-pointer"
              >
                Correct (+10 pts)
              </button>
              <button
                onClick={() => onVerify(post.id, false)}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] py-1.5 rounded-xl transition cursor-pointer"
              >
                Incorrect
              </button>
            </div>
          )}
        </div>
      )}

      {post.predictionStatus === "correct" && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-750 text-[10px] font-bold py-1.5 px-3 rounded-xl text-center">
          ✓ Prediction Verified: Correct (+10 platform points sync)
        </div>
      )}

      {post.predictionStatus === "incorrect" && (
        <div className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-bold py-1.5 px-3 rounded-xl text-center">
          ✗ Prediction Verified: Incorrect
        </div>
      )}
    </div>
  );
}
