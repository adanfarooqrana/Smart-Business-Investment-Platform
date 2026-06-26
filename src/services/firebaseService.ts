import { auth, database, storage } from '../firebase';
import { RTDB } from '@/lib/rtdbPaths';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  ref, 
  set, 
  get, 
  push, 
  update, 
  onValue, 
  remove 
} from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';

// ============================================================================
// MODULE 1 - AUTH
// ============================================================================

export const registerUser = async (email: string, password: string, name: string, role: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  await set(ref(database, `users/${user.uid}`), {
    uid: user.uid,
    name,
    email,
    role,
    createdAt: Date.now()
  });

  await set(ref(database, RTDB.points(user.uid)), {
    uid: user.uid,
    points: 120,
    updatedAt: Date.now()
  });

  await set(ref(database, RTDB.userDirectoryEntry(user.uid)), {
    uid: user.uid,
    name,
    email,
    role,
    createdAt: Date.now(),
  });

  const { syncPlatformStatsToRtdb } = await import("@/services/platformStatsService");
  void syncPlatformStatsToRtdb();
  
  return userCredential;
};

export const loginUser = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getUserRole = async (uid: string) => {
  const snapshot = await get(ref(database, `users/${uid}`));
  if (!snapshot.exists()) return null;
  const data = snapshot.val() as { role?: string };
  return data?.role ?? null;
};

// ============================================================================
// MODULE 2 - BUSINESS PROFILE
// ============================================================================

export interface BusinessProfile {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  size?: string;
  website?: string;
  about?: string;
  registerNumber?: string;
  trademark?: string;
  isRegistered?: boolean;
  isApproved?: boolean;
  profileCompletion?: number;
  landingPageCreated?: boolean;
  landingPageTemplate?: string;
  landingPageAbout?: string;
  visitors?: number;
  score?: number;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  cnicFront?: string;
  cnicBack?: string;
  liveSelfie?: string;
  createdAt?: number;
}

export const saveBusinessProfile = async (uid: string, profile: BusinessProfile) => {
  await set(ref(database, RTDB.userBusiness(uid)), {
    ...profile,
    uid,
    createdAt: Date.now()
  });
};

export const getBusinessProfile = async (uid: string) => {
  const snapshot = await get(ref(database, RTDB.userBusiness(uid)));
  return snapshot.exists() ? snapshot.val() : null;
};

export const updateBusinessProfile = async (uid: string, updates: Partial<BusinessProfile>) => {
  await update(ref(database, RTDB.userBusiness(uid)), updates);
};

export const updateBusinessScore = async (uid: string, score: number) => {
  await update(ref(database, RTDB.userBusiness(uid)), { score });
};

export const incrementBusinessVisitors = async (uid: string) => {
  const visitorsRef = ref(database, `${RTDB.userBusiness(uid)}/visitors`);
  const snapshot = await get(visitorsRef);
  const currentVal = snapshot.exists() ? snapshot.val() : 0;
  await set(visitorsRef, currentVal + 1);
};

// ============================================================================
// MODULE 3 - INVESTOR PROFILE
// ============================================================================

export interface InvestorProfile {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  categories?: string[];
  ticketSize?: string;
  budgetRange?: string;
  location?: string;
  strategy?: string;
  isRegistered?: boolean;
  isApproved?: boolean;
  entityType?: string;
  aiConsultantToken?: string;
  cnicFront?: string;
  cnicBack?: string;
  liveSelfie?: string;
  createdAt?: number;
}

export const saveInvestorProfile = async (uid: string, profile: InvestorProfile) => {
  await set(ref(database, RTDB.investors(uid)), {
    ...profile,
    uid,
    createdAt: Date.now()
  });
  await set(ref(database, RTDB.userDirectoryEntry(uid)), {
    uid,
    name: profile.name,
    email: profile.email,
    role: "investor",
    createdAt: Date.now(),
  });
};

export const getInvestorProfile = async (uid: string) => {
  const snapshot = await get(ref(database, RTDB.investors(uid)));
  return snapshot.exists() ? snapshot.val() : null;
};

export const getEntrepreneurRtdbProfile = async (uid: string) => {
  const snapshot = await get(ref(database, RTDB.entrepreneurs(uid)));
  return snapshot.exists() ? snapshot.val() : null;
};

export const updateInvestorProfile = async (uid: string, updates: Partial<InvestorProfile>) => {
  await update(ref(database, RTDB.investors(uid)), updates);
};

// ============================================================================
// MODULE 4 - CONSULTANT PROFILE
// ============================================================================

export interface ConsultantProfile {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  specialty?: string;
  experience?: string;
  location?: string;
  bio?: string;
  isRegistered?: boolean;
  isApproved?: boolean;
  cnicFront?: string;
  cnicBack?: string;
  liveSelfie?: string;
  createdAt?: number;
}

export const saveConsultantProfile = async (uid: string, profile: ConsultantProfile) => {
  await set(ref(database, RTDB.wholesalers(uid)), {
    ...profile,
    uid,
    createdAt: Date.now()
  });
};

export const getConsultantProfile = async (uid: string) => {
  const snapshot = await get(ref(database, RTDB.wholesalers(uid)));
  return snapshot.exists() ? snapshot.val() : null;
};

// ============================================================================
// MODULE 5 - REVIEWS
// ============================================================================

export interface Review {
  businessId: string;
  name: string;
  rating: number;
  text: string;
  createdAt?: number;
}

export const addReview = async (review: Review) => {
  const newRef = push(ref(database, `${RTDB.users(review.businessId)}/reviews`));
  await set(newRef, {
    ...review,
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getReviewsByBusiness = async (businessId: string) => {
  const snapshot = await get(ref(database, `${RTDB.users(businessId)}/reviews`));
  if (!snapshot.exists()) return [];
  const reviews: any[] = [];
  snapshot.forEach((child) => {
    reviews.push({ id: child.key, ...child.val() });
  });
  return reviews.sort((a, b) => b.createdAt - a.createdAt);
};

export const subscribeToReviews = (businessId: string, callback: (reviews: any[]) => void) => {
  return onValue(ref(database, `${RTDB.users(businessId)}/reviews`), (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const reviews: any[] = [];
    snapshot.forEach((child) => {
      reviews.push({ id: child.key, ...child.val() });
    });
    callback(reviews.sort((a, b) => b.createdAt - a.createdAt));
  });
};

// ============================================================================
// MODULE 6 - DEALS
// ============================================================================

export interface Deal {
  businessId: string;
  title: string;
  description: string;
  discount: string;
  visitors?: number;
  createdAt?: number;
}

export const addDeal = async (deal: Deal) => {
  const newRef = push(ref(database, `${RTDB.users(deal.businessId)}/deals`));
  await set(newRef, {
    ...deal,
    visitors: deal.visitors || 0,
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getDealsByBusiness = async (businessId: string) => {
  const snapshot = await get(ref(database, `${RTDB.users(businessId)}/deals`));
  if (!snapshot.exists()) return [];
  const deals: any[] = [];
  snapshot.forEach((child) => {
    deals.push({ id: child.key, ...child.val() });
  });
  return deals.sort((a, b) => b.createdAt - a.createdAt);
};

export const incrementDealVisitors = async (businessId: string, dealId: string) => {
  const visitorsRef = ref(database, `${RTDB.users(businessId)}/deals/${dealId}/visitors`);
  const snapshot = await get(visitorsRef);
  const currentVal = snapshot.exists() ? snapshot.val() : 0;
  await set(visitorsRef, currentVal + 1);
};

// ============================================================================
// MODULE 7 - COMMUNITY POSTS
// ============================================================================

export interface CommunityPost {
  author?: string;
  role?: string;
  badge?: string;
  category?: string;
  tag?: string;
  avatarColor?: string;
  title?: string;
  content?: string;
  votes?: number;
  shares?: number;
  photoType?: string;
  isStatsPost?: boolean;
  stats?: {
    score?: number;
    reviewsCount?: number;
    visitorsCount?: number;
  };
  isPrediction?: boolean;
  predictionStatus?: string;
  predictionExpiryTime?: number;
  isMarketingBlueprint?: boolean;
  beforeMetrics?: string;
  afterMetrics?: string;
  isPackagingReq?: boolean;
  materialType?: string;
  packagingQuotes?: Record<string, {
    id?: string;
    supplierName?: string;
    avatarColor?: string;
    price?: string;
    timeline?: string;
    accepted?: boolean;
  }>;
  isProblem?: boolean;
  urgency?: string;
  nicheOwnersNotified?: string;
  aiResolutionMock?: string;
  proofAttachment?: string;
  entrepreneurProblem?: boolean;
  entrepreneurTargetRole?: string;
  founderProblemId?: string;
  createdAt?: number;
}

export const addCommunityPost = async (post: CommunityPost) => {
  const newRef = push(ref(database, 'community_posts'));
  await set(newRef, {
    ...post,
    votes: post.votes || 0,
    shares: post.shares || 0,
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getCommunityPosts = async () => {
  const snapshot = await get(ref(database, 'community_posts'));
  if (!snapshot.exists()) return [];
  const posts: any[] = [];
  snapshot.forEach((child) => {
    posts.push({ id: child.key, ...child.val() });
  });
  return posts.sort((a, b) => b.createdAt - a.createdAt);
};

export const subscribeToCommunityPosts = (callback: (posts: any[]) => void) => {
  return onValue(
    ref(database, "community_posts"),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }
      const posts: any[] = [];
      snapshot.forEach((child) => {
        posts.push({ id: child.key, ...child.val() });
      });
      callback(posts.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)));
    },
    (err) => {
      console.warn("community_posts listener error:", err);
      callback([]);
    },
  );
};

export const upvoteCommunityPost = async (postId: string, diff: number) => {
  const votesRef = ref(database, `community_posts/${postId}/votes`);
  const snapshot = await get(votesRef);
  const currentVal = snapshot.exists() ? snapshot.val() : 0;
  await set(votesRef, currentVal + diff);
};

export const shareCommunityPost = async (postId: string) => {
  const sharesRef = ref(database, `community_posts/${postId}/shares`);
  const snapshot = await get(sharesRef);
  const currentVal = snapshot.exists() ? snapshot.val() : 0;
  await set(sharesRef, currentVal + 1);
};

export const updatePredictionStatus = async (postId: string, status: string) => {
  await update(ref(database, `community_posts/${postId}`), { predictionStatus: status });
};

export const acceptPackagingQuote = async (postId: string, quoteId: string) => {
  await update(ref(database, `community_posts/${postId}/packagingQuotes/${quoteId}`), { accepted: true });
};

// ============================================================================
// MODULE 8 - COMMENTS
// ============================================================================

export interface Comment {
  author: string;
  avatarColor: string;
  content: string;
  createdAt?: number;
}

export const addCommunityComment = async (postId: string, comment: Comment) => {
  const newRef = push(ref(database, RTDB.communityPostComments(postId)));
  await set(newRef, {
    ...comment,
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getCommentsForPost = async (postId: string) => {
  const snapshot = await get(ref(database, RTDB.communityPostComments(postId)));
  if (!snapshot.exists()) return [];
  const comments: any[] = [];
  snapshot.forEach((child) => {
    comments.push({ id: child.key, ...child.val() });
  });
  return comments.sort((a, b) => a.createdAt - b.createdAt);
};

export const subscribeToComments = (postId: string, callback: (comments: any[]) => void) => {
  return onValue(ref(database, RTDB.communityPostComments(postId)), (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const comments: any[] = [];
    snapshot.forEach((child) => {
      comments.push({ id: child.key, ...child.val() });
    });
    callback(comments.sort((a, b) => a.createdAt - b.createdAt));
  });
};

// ============================================================================
// MODULE 9 - OFFERS
// ============================================================================

export interface Offer {
  businessId: string;
  businessName: string;
  investorName: string;
  amount: string | number;
  terms: string;
  message: string;
  status?: string;
  type: string;
  createdAt?: number;
}

export const addOffer = async (offer: Offer) => {
  const newRef = push(ref(database, `${RTDB.users(offer.businessId)}/offers`));
  await set(newRef, {
    ...offer,
    status: 'pending',
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getOffersByBusiness = async (businessId: string) => {
  const snapshot = await get(ref(database, `${RTDB.users(businessId)}/offers`));
  if (!snapshot.exists()) return [];
  const offers: any[] = [];
  snapshot.forEach((child) => {
    offers.push({ id: child.key, ...child.val() });
  });
  return offers.sort((a, b) => b.createdAt - a.createdAt);
};

export const updateOfferStatus = async (businessId: string, offerId: string, status: string) => {
  await update(ref(database, `${RTDB.users(businessId)}/offers/${offerId}`), { status });
};

export const subscribeToOffers = (businessId: string, callback: (offers: any[]) => void) => {
  return onValue(ref(database, `${RTDB.users(businessId)}/offers`), (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const offers: any[] = [];
    snapshot.forEach((child) => {
      offers.push({ id: child.key, ...child.val() });
    });
    callback(offers.sort((a, b) => b.createdAt - a.createdAt));
  });
};

// ============================================================================
// MODULE 10 - INVESTMENTS
// ============================================================================

export interface Investment {
  investorId: string;
  businessName: string;
  amount: number | string;
  terms: string;
  type: string;
  method: string;
  status?: string;
  createdAt?: number;
}

export const addInvestment = async (investment: Investment) => {
  const newRef = push(ref(database, `${RTDB.investors(investment.investorId)}/investments`));
  await set(newRef, {
    ...investment,
    status: 'completed',
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getInvestmentsByInvestor = async (investorId: string) => {
  const snapshot = await get(ref(database, `${RTDB.investors(investorId)}/investments`));
  if (!snapshot.exists()) return [];
  const investments: any[] = [];
  snapshot.forEach((child) => {
    investments.push({ id: child.key, ...child.val() });
  });
  return investments.sort((a, b) => b.createdAt - a.createdAt);
};

// ============================================================================
// MODULE 11 - POINTS
// ============================================================================

export const initializeUserPoints = async (uid: string, points: number) => {
  await set(ref(database, RTDB.points(uid)), {
    uid,
    points,
    updatedAt: Date.now()
  });
};

export const awardPoints = async (uid: string, amount: number) => {
  const pointsRef = ref(database, `${RTDB.points(uid)}/points`);
  const snapshot = await get(pointsRef);
  const currentVal = snapshot.exists() ? snapshot.val() : 0;
  await update(ref(database, RTDB.points(uid)), {
    points: currentVal + amount,
    updatedAt: Date.now()
  });
};

export const getUserPoints = async (uid: string) => {
  const snapshot = await get(ref(database, `${RTDB.points(uid)}/points`));
  return snapshot.exists() ? snapshot.val() : 0;
};

export const subscribeToPoints = (uid: string, callback: (points: any) => void) => {
  return onValue(ref(database, RTDB.points(uid)), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });
};

// ============================================================================
// MODULE 11b - NOTIFICATIONS
// ============================================================================

export const sendNotification = async (
  targetUid: string,
  notification: { type: string; message: string; relatedId?: string },
) => {
  const notifRef = push(ref(database, RTDB.notifications(targetUid)));
  await set(notifRef, {
    ...notification,
    read: false,
    timestamp: Date.now(),
  });
};

// ============================================================================
// MODULE 12 - WEAKNESS FEEDBACK
// ============================================================================

export const addWeaknessFeedback = async (businessId: string, text: string) => {
  const newRef = push(ref(database, `${RTDB.users(businessId)}/weakness_feedback`));
  await set(newRef, {
    text,
    createdAt: Date.now()
  });
  return newRef.key;
};

export const getWeaknessFeedback = async (businessId: string) => {
  const snapshot = await get(ref(database, `${RTDB.users(businessId)}/weakness_feedback`));
  if (!snapshot.exists()) return [];
  const feedbacks: any[] = [];
  snapshot.forEach((child) => {
    feedbacks.push({ id: child.key, ...child.val() });
  });
  return feedbacks.sort((a, b) => b.createdAt - a.createdAt);
};

// ============================================================================
// MODULE 13 - SEMINARS
// ============================================================================

export const registerForSeminar = async (uid: string, seminarId: string) => {
  await set(ref(database, `${RTDB.users(uid)}/seminar_registrations/${seminarId}`), {
    registeredAt: Date.now()
  });
};

export const getUserSeminars = async (uid: string) => {
  const snapshot = await get(ref(database, `${RTDB.users(uid)}/seminar_registrations`));
  if (!snapshot.exists()) return [];
  const seminars: string[] = [];
  snapshot.forEach((child) => {
    seminars.push(child.key as string);
  });
  return seminars;
};

// ============================================================================
// MODULE 14 - USER PREFERENCES
// ============================================================================

export const toggleLikePost = async (uid: string, postId: string, isLiked: boolean) => {
  const likeRef = ref(database, `${RTDB.users(uid)}/preferences/likedPosts/${postId}`);
  if (isLiked) {
    await remove(likeRef);
    await upvoteCommunityPost(postId, -1);
  } else {
    await set(likeRef, true);
    await upvoteCommunityPost(postId, 1);
  }
};

export const toggleSavePost = async (uid: string, postId: string, isSaved: boolean) => {
  const saveRef = ref(database, `${RTDB.users(uid)}/preferences/savedPosts/${postId}`);
  if (isSaved) {
    await remove(saveRef);
  } else {
    await set(saveRef, true);
  }
};

export const toggleFollowUser = async (uid: string, targetUsername: string, isFollowing: boolean) => {
  const followRef = ref(database, `${RTDB.users(uid)}/preferences/followedUsers/${targetUsername}`);
  if (isFollowing) {
    await remove(followRef);
  } else {
    await set(followRef, true);
  }
};

export const getUserPreferences = async (uid: string) => {
  const snapshot = await get(ref(database, `${RTDB.users(uid)}/preferences`));
  if (snapshot.exists()) {
    return snapshot.val();
  }
  return { likedPosts: {}, savedPosts: {}, followedUsers: {} };
};

// ============================================================================
// MODULE 15 - STORAGE UPLOAD
// ============================================================================

export const uploadBase64Image = async (uid: string, fileName: string, base64Data: string, mimeType: string = 'image/jpeg') => {
  const fileRef = storageRef(storage, `uploads/${uid}/${fileName}`);
  const snapshot = await uploadString(fileRef, base64Data, 'data_url');
  return await getDownloadURL(snapshot.ref);
};

// ============================================================================
// MODULE 16 - SOCIAL LINKS
// ============================================================================

export const updateSocialLinks = async (uid: string, links: any) => {
  await update(ref(database, `${RTDB.userBusiness(uid)}/socialLinks`), links);
};

// ============================================================================
// MODULE 17 - LANDING PAGE
// ============================================================================

export const saveLandingPage = async (uid: string, template: string, aboutText: string) => {
  await update(ref(database, RTDB.userBusiness(uid)), {
    landingPageCreated: true,
    landingPageTemplate: template,
    landingPageAbout: aboutText
  });
};

// ============================================================================
// MODULE 18 - SCORE RECALCULATION
// ============================================================================

export const recalculateAndSaveScore = async (
  uid: string, 
  reviews: Review[], 
  visitors: number, 
  dealsCount: number, 
  socialLinks: any, 
  landingPageCreated: boolean
) => {
  let score = 65; 

  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    score += Math.min(avgRating * 4, 20);
  }

  if (visitors > 1000) score += 10;
  else if (visitors > 500) score += 6;
  else if (visitors > 200) score += 3;

  score += Math.min(dealsCount * 5, 10);

  if (socialLinks) {
    const activeLinks = Object.values(socialLinks).filter(val => !!val).length;
    score += Math.min(activeLinks * 2.5, 10);
  }

  score = Math.min(Math.round(score), 100);

  let profileCompletion = 75;
  if (landingPageCreated) profileCompletion += 15;
  if (socialLinks && Object.values(socialLinks).some(val => !!val)) profileCompletion += 10;

  await update(ref(database, RTDB.userBusiness(uid)), {
    score,
    profileCompletion
  });
};

// ============================================================================
// MODULE 19 - AUTO SEED
// ============================================================================

const seedCommunityPosts = async () => {
  const postsRef = ref(database, 'community_posts');
  const snapshot = await get(postsRef);
  
  if (!snapshot.exists() || snapshot.val() === null) {
    const defaultPosts = [
      { 
        author: "u/growth_hacker_pk", 
        role: "consultant", 
        badge: "Verified Consultant", 
        category: "Insight Board", 
        tag: "Prediction",
        avatarColor: "bg-blue-600", 
        title: "Future Market Prediction: Gujranwala Wholesale demand shifts to Biodegradable items", 
        content: "I predict that eco-friendly packaging demand in the Gujranwala cluster will surge by over 45% in the next quarter due to local green retail initiatives.", 
        votes: 38, 
        shares: 0, 
        isPrediction: true, 
        predictionStatus: "active", 
        predictionExpiryTime: Date.now() + 86400000,
        createdAt: Date.now()
      },
      { 
        author: "u/coffee_bean_founder", 
        role: "business", 
        badge: "Business Owner", 
        category: "Marketing Strategy", 
        tag: "Tactics",
        avatarColor: "bg-emerald-500", 
        title: "Before/After Loyalty App Launch Performance Metrics", 
        content: "Here is the blueprint for our digital stamp cards. We rotated discounts weekly, boosting return visits and score ratings.",
        beforeMetrics: "15% Customer Return Rate, 4.1 Rating Score",
        afterMetrics: "48% Customer Return Rate, 4.8 Rating Score (+120% conversion)",
        isMarketingBlueprint: true, 
        votes: 55, 
        shares: 0,
        createdAt: Date.now()
      },
      { 
        author: "u/retail_revolution", 
        role: "business", 
        badge: "Business Owner", 
        category: "B2B Packaging", 
        tag: "Requirements",
        avatarColor: "bg-emerald-600", 
        title: "Requirement: 5000 Custom Printed Biodegradable Courier Bags", 
        content: "We need courier mailers with gold-leaf custom branding. Material must be eco-friendly and fully water-resistant.",
        isPackagingReq: true, 
        materialType: "Biodegradable Plastic / Kraft Paper",
        votes: 12, 
        shares: 0, 
        packagingQuotes: { 
          q1: { id: "q1", supplierName: "Sarah Sterling (Wholesaler)", avatarColor: "bg-purple-500", price: "PKR 45000 total", timeline: "3 business days", accepted: false },
          q2: { id: "q2", supplierName: "Gujranwala Package Co.", avatarColor: "bg-amber-500", price: "PKR 41000 total", timeline: "7 business days", accepted: false } 
        },
        createdAt: Date.now()
      },
      { 
        author: "u/fashion_boutique_hyd", 
        role: "business",
        badge: "Business Owner", 
        category: "Problems Hub", 
        tag: "Logistics",
        avatarColor: "bg-indigo-500", 
        title: "Problem: Raw cotton delivery delays from central Punjab", 
        content: "We are facing a 5-day lag in raw cotton arrivals halting our sewing assembly lines.",
        isProblem: true, 
        urgency: "High", 
        nicheOwnersNotified: "Sarah Sterling,Zain Malik,Aman Ullah",
        aiResolutionMock: "AI Suggestion: Consider establishing a buffer stock of 15% using Gujranwala localized warehousing grid.", 
        votes: 8, 
        shares: 0,
        createdAt: Date.now()
      },
      { 
        author: "u/coffee_bean_founder", 
        role: "business",
        badge: "Business Owner", 
        category: "Success Story", 
        tag: "Funding",
        avatarColor: "bg-emerald-500", 
        title: "How we increased our SmartBiz reputation score to 94 and secured 150k in VC funding in 30 days",
        content: "We registered our coffee brand synced reviews and used the AI Consultant advice to run text loyalty promos. Yesterday we closed seed funding!", 
        photoType: "coffee", 
        votes: 142, 
        shares: 0,
        createdAt: Date.now()
      }
    ];

    for (const post of defaultPosts) {
      await set(push(postsRef), post);
    }
  }
};

seedCommunityPosts();
