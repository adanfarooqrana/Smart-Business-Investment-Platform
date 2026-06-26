/** Firebase Realtime Database paths aligned with database.rules.json */

export const RTDB = {
  users: (uid: string) => `users/${uid}`,
  userBusiness: (uid: string) => `users/${uid}/business`,
  entrepreneurs: (uid: string) => `entrepreneurs/${uid}`,
  investors: (uid: string) => `investors/${uid}`,
  wholesalers: (uid: string) => `wholesalers/${uid}`,
  communityPosts: "community_posts",
  communityPost: (postId: string) => `community_posts/${postId}`,
  communityPostComments: (postId: string) => `community_posts/${postId}/comments`,
  communityPostLikes: (postId: string, userId: string) =>
    `community_posts/${postId}/likes/${userId}`,
  messages: "messages",
  message: (messageId: string) => `messages/${messageId}`,
  groups: "groups",
  group: (groupId: string) => `groups/${groupId}`,
  groupMessages: (groupId: string) => `group_messages/${groupId}`,
  sampleOrders: "sample_orders",
  sampleOrder: (orderId: string) => `sample_orders/${orderId}`,
  payments: "payments",
  payment: (paymentId: string) => `payments/${paymentId}`,
  videoLounge: "video_lounge",
  videoLoungeVideos: "video_lounge/videos",
  videoLoungeVideo: (videoId: string) => `video_lounge/videos/${videoId}`,
  videoLoungeLikes: (videoId: string, userId: string) =>
    `video_lounge/likes/${videoId}/${userId}`,
  videoLoungeVideoLikes: (videoId: string) => `video_lounge/likes/${videoId}`,
  videoLoungeFavorites: (userId: string, videoId: string) =>
    `video_lounge/favorites/${userId}/${videoId}`,
  videoLoungeAdvice: (videoId: string) => `video_lounge/advice/${videoId}`,
  videoLoungeComments: (videoId: string) => `video_lounge/comments/${videoId}`,
  notifications: (uid: string) => `notifications/${uid}`,
  followers: (followerId: string) => `followers/${followerId}`,
  points: (userId: string) => `points/${userId}`,
  entrepreneurIdeas: (uid: string) => `entrepreneurs/${uid}/ideas`,
  entrepreneurIdea: (uid: string, ideaId: string) => `entrepreneurs/${uid}/ideas/${ideaId}`,
  userDirectory: "user_directory",
  userDirectoryEntry: (uid: string) => `user_directory/${uid}`,
  investorFeed: "investor_feed",
  investorFeedIdea: (ideaId: string) => `investor_feed/${ideaId}`,
  founderProblems: "founder_problems",
  founderProblem: (problemId: string) => `founder_problems/${problemId}`,
  /** Public landing-page metrics (manual overrides + display) */
  platformStats: "platform_stats",
  /** Verified reviews shown on landing */
  landingTestimonials: "landing_testimonials",
} as const;
