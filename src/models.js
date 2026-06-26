/**
 * Firebase Realtime Database data models.
 *
 * Each entity exposes:
 *   - create<Entity>(data)   → normalized object with sane defaults
 *   - validate<Entity>(data) → { valid: boolean, errors: string[] }
 *
 * These are plain JS factories so they can be used from any service before
 * calling the helpers in `database.js` (writeData / pushData / etc.).
 */

// ============================================================================
// Shared validation primitives
// ============================================================================

const isString = (v) => typeof v === "string" && v.trim().length > 0;
const isEmail = (v) => isString(v) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isNumber = (v) => typeof v === "number" && !Number.isNaN(v);
const isNumeric = (v) => isNumber(v) || (isString(v) && !Number.isNaN(Number(v)));
const isBool = (v) => typeof v === "boolean";
const isArray = (v) => Array.isArray(v);

/** Build a `{ valid, errors }` result from a list of [condition, message]. */
const check = (rules) => {
  const errors = rules.filter(([ok]) => !ok).map(([, msg]) => msg);
  return { valid: errors.length === 0, errors };
};

const now = () => Date.now();
const genId = (prefix) =>
  `${prefix}-${
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : now().toString(36)
  }`;

// ============================================================================
// 1. entrepreneurs
// ============================================================================

export const createEntrepreneur = (data = {}) => ({
  id: data.id || genId("ent"),
  name: data.name || "",
  email: data.email || "",
  phone: data.phone || "",
  cnic_front: data.cnic_front || "",
  cnic_back: data.cnic_back || "",
  jazzcash_number: data.jazzcash_number || "",
  verified: data.verified ?? false,
  createdAt: data.createdAt || now(),
});

export const validateEntrepreneur = (data = {}) =>
  check([
    [isString(data.name), "name is required"],
    [isEmail(data.email), "valid email is required"],
    [isString(data.phone), "phone is required"],
    [isBool(data.verified ?? false), "verified must be a boolean"],
  ]);

// ============================================================================
// 2. investors
// ============================================================================

export const createInvestor = (data = {}) => ({
  id: data.id || genId("inv"),
  name: data.name || "",
  email: data.email || "",
  phone: data.phone || "",
  investment_range: data.investment_range || "",
  interest_fields: isArray(data.interest_fields) ? data.interest_fields : [],
  createdAt: data.createdAt || now(),
});

export const validateInvestor = (data = {}) =>
  check([
    [isString(data.name), "name is required"],
    [isEmail(data.email), "valid email is required"],
    [isString(data.phone), "phone is required"],
    [isArray(data.interest_fields), "interest_fields must be an array"],
  ]);

// ============================================================================
// 3. investment_ideas
// ============================================================================

export const IDEA_STAGES = [1, 2, 3];
export const IDEA_STATUSES = ["draft", "live", "funded", "closed", "rejected"];

export const createInvestmentIdea = (data = {}) => ({
  id: data.id || genId("pitch"),
  entrepreneurId: data.entrepreneurId || "",
  title: data.title || "",
  description: data.description || "",
  category: data.category || "",
  amount: data.amount ?? 0,
  equity: data.equity ?? 0,
  roi: data.roi ?? 0,
  profit_share: data.profit_share ?? 0,
  stage: data.stage || 1,
  status: data.status || "draft",
  createdAt: data.createdAt || now(),
});

export const validateInvestmentIdea = (data = {}) =>
  check([
    [isString(data.entrepreneurId), "entrepreneurId is required"],
    [isString(data.title), "title is required"],
    [isString(data.category), "category is required"],
    [isNumeric(data.amount), "amount must be numeric"],
    [isNumeric(data.equity), "equity must be numeric"],
    [IDEA_STAGES.includes(data.stage), "stage must be 1, 2 or 3"],
    [IDEA_STATUSES.includes(data.status || "draft"), `status must be one of ${IDEA_STATUSES.join(", ")}`],
  ]);

// ============================================================================
// 4. stage1_data
// ============================================================================

export const createStage1Data = (data = {}) => ({
  ideaId: data.ideaId || "",
  founderName: data.founderName || "",
  ideaTitle: data.ideaTitle || "",
  category: data.category || "",
  roi: data.roi ?? 0,
  equity: data.equity ?? 0,
  profitShare: data.profitShare ?? 0,
  aiAnalysis: data.aiAnalysis || "",
});

export const validateStage1Data = (data = {}) =>
  check([
    [isString(data.ideaId), "ideaId is required"],
    [isString(data.founderName), "founderName is required"],
    [isString(data.ideaTitle), "ideaTitle is required"],
    [isNumeric(data.roi), "roi must be numeric"],
    [isNumeric(data.equity), "equity must be numeric"],
  ]);

// ============================================================================
// 5. stage2_data
// ============================================================================

export const createStage2Data = (data = {}) => ({
  ideaId: data.ideaId || "",
  requiredAmount: data.requiredAmount ?? 0,
  equityAssigned: data.equityAssigned ?? 0,
  profitProjection: data.profitProjection || "",
  proofImages: isArray(data.proofImages) ? data.proofImages : [],
  customerList: isArray(data.customerList) ? data.customerList : [],
  aiVerification: data.aiVerification || "",
  approved: data.approved ?? false,
});

export const validateStage2Data = (data = {}) =>
  check([
    [isString(data.ideaId), "ideaId is required"],
    [isNumeric(data.requiredAmount), "requiredAmount must be numeric"],
    [isNumeric(data.equityAssigned), "equityAssigned must be numeric"],
    [isArray(data.proofImages), "proofImages must be an array"],
    [isBool(data.approved ?? false), "approved must be a boolean"],
  ]);

// ============================================================================
// 6. stage3_data
// ============================================================================

export const createStage3Data = (data = {}) => ({
  ideaId: data.ideaId || "",
  agreementText: data.agreementText || "",
  paymentMethod: data.paymentMethod || "",
  paymentNumber: data.paymentNumber || "",
  otpVerified: data.otpVerified ?? false,
  paymentScreenshot: data.paymentScreenshot || "",
  deliveryAddress: data.deliveryAddress || "",
  deliveryService: data.deliveryService || "",
  trackingStatus: data.trackingStatus || "pending",
  meetingScheduled: data.meetingScheduled ?? false,
});

export const validateStage3Data = (data = {}) =>
  check([
    [isString(data.ideaId), "ideaId is required"],
    [isString(data.agreementText), "agreementText is required"],
    [isString(data.paymentMethod), "paymentMethod is required"],
    [isBool(data.otpVerified ?? false), "otpVerified must be a boolean"],
  ]);

// ============================================================================
// 7. messages
// ============================================================================

export const createMessage = (data = {}) => ({
  id: data.id || genId("msg"),
  fromId: data.fromId || "",
  toId: data.toId || "",
  ideaId: data.ideaId || "",
  message: data.message || "",
  read: data.read ?? false,
  createdAt: data.createdAt || now(),
});

export const validateMessage = (data = {}) =>
  check([
    [isString(data.fromId), "fromId is required"],
    [isString(data.toId), "toId is required"],
    [isString(data.message), "message is required"],
    [isBool(data.read ?? false), "read must be a boolean"],
  ]);

// ============================================================================
// 8. sample_requests
// ============================================================================

export const SAMPLE_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "shipped",
  "delivered",
  "rejected",
];

export const createSampleRequest = (data = {}) => ({
  id: data.id || genId("sample"),
  investorId: data.investorId || "",
  ideaId: data.ideaId || "",
  status: data.status || "pending",
  address: data.address || "",
  trackingId: data.trackingId || "",
  createdAt: data.createdAt || now(),
});

export const validateSampleRequest = (data = {}) =>
  check([
    [isString(data.investorId), "investorId is required"],
    [isString(data.ideaId), "ideaId is required"],
    [
      SAMPLE_REQUEST_STATUSES.includes(data.status || "pending"),
      `status must be one of ${SAMPLE_REQUEST_STATUSES.join(", ")}`,
    ],
  ]);

// ============================================================================
// 9. payments
// ============================================================================

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

export const createPayment = (data = {}) => ({
  id: data.id || genId("pay"),
  investorId: data.investorId || "",
  ideaId: data.ideaId || "",
  amount: data.amount ?? 0,
  method: data.method || "",
  status: data.status || "pending",
  screenshotUrl: data.screenshotUrl || "",
  createdAt: data.createdAt || now(),
});

export const validatePayment = (data = {}) =>
  check([
    [isString(data.investorId), "investorId is required"],
    [isString(data.ideaId), "ideaId is required"],
    [isNumeric(data.amount), "amount must be numeric"],
    [isString(data.method), "method is required"],
    [
      PAYMENT_STATUSES.includes(data.status || "pending"),
      `status must be one of ${PAYMENT_STATUSES.join(", ")}`,
    ],
  ]);

// ============================================================================
// 10. notifications
// ============================================================================

export const NOTIFICATION_TYPES = [
  "info",
  "investment",
  "message",
  "payment",
  "sample",
  "agreement",
  "system",
];

export const createNotification = (data = {}) => ({
  id: data.id || genId("notif"),
  userId: data.userId || "",
  message: data.message || "",
  type: data.type || "info",
  read: data.read ?? false,
  createdAt: data.createdAt || now(),
});

export const validateNotification = (data = {}) =>
  check([
    [isString(data.userId), "userId is required"],
    [isString(data.message), "message is required"],
    [
      NOTIFICATION_TYPES.includes(data.type || "info"),
      `type must be one of ${NOTIFICATION_TYPES.join(", ")}`,
    ],
    [isBool(data.read ?? false), "read must be a boolean"],
  ]);

// ============================================================================
// 11. community_posts
// ============================================================================

export const createCommunityPost = (data = {}) => ({
  id: data.id || genId("post"),
  userId: data.userId || "",
  type: data.type || "discussion",
  title: data.title || "",
  content: data.content || "",
  category: data.category || "",
  proofUrl: data.proofUrl || "",
  isPinned: data.isPinned ?? false,
  likes: data.likes ?? 0,
  comments: isArray(data.comments) ? data.comments : [],
  createdAt: data.createdAt || now(),
});

export const validateCommunityPost = (data = {}) =>
  check([
    [isString(data.userId), "userId is required"],
    [isString(data.title), "title is required"],
    [isString(data.content), "content is required"],
    [isBool(data.isPinned ?? false), "isPinned must be a boolean"],
    [isNumeric(data.likes ?? 0), "likes must be numeric"],
  ]);

// ============================================================================
// Registry — handy for generic tooling / iteration
// ============================================================================

export const MODELS = {
  entrepreneurs: { create: createEntrepreneur, validate: validateEntrepreneur },
  investors: { create: createInvestor, validate: validateInvestor },
  investment_ideas: { create: createInvestmentIdea, validate: validateInvestmentIdea },
  stage1_data: { create: createStage1Data, validate: validateStage1Data },
  stage2_data: { create: createStage2Data, validate: validateStage2Data },
  stage3_data: { create: createStage3Data, validate: validateStage3Data },
  messages: { create: createMessage, validate: validateMessage },
  sample_requests: { create: createSampleRequest, validate: validateSampleRequest },
  payments: { create: createPayment, validate: validatePayment },
  notifications: { create: createNotification, validate: validateNotification },
  community_posts: { create: createCommunityPost, validate: validateCommunityPost },
};
