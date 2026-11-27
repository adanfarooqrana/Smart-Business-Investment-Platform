// src/services/businessOwnerService.ts
// @ts-ignore
import { auth, db } from "../firebase";
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    User
} from "firebase/auth";
import { ref, set, get, update, remove, push, runTransaction } from "firebase/database";

export interface CanonicalProduct {
    id: string;
    name: string;
    description: string;
    real_price: number;
    sale_price: number;
    /** List / MRP before discount — shown struck on storefront */
    original_price?: number;
    quantity: number;
    /** Up to 3 Cloudinary HTTPS URLs (main, angle, detail) */
    images: string[];
    /** Alias of images — preferred write key for storefront */
    imageUrls?: string[];
    /** Primary / first image (backward compatible) */
    productImageUrl?: string;
}

export interface WebsiteSettings {
    theme_color?: string;
    /** Full-page storefront background */
    background_color?: string;
    text_color?: string;
    heading_color?: string;
    hero_background?: string;
    /** modern | elegant | bold | classic | tech | friendly */
    font_family?: string;
    card_background?: string;
    nav_background?: string;
    banner_title: string;
    banner_description: string;
    banner_image_url?: string;
    logo_url?: string;
    /** false until Grok/AI storefront generation completes; true for returning owners */
    isWebsiteCreated?: boolean;
    subdomain?: string;
    publishedUrl?: string;
    /** Industry niche detected from AI prompt (clothing, fast_food, …) */
    industry_category?: string;
    industry_label?: string;
}

export interface ProductReview {
    customer_name: string;
    rating: number;
    review_text: string;
    timestamp: number;
    /** NLP classification */
    sentiment?: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
    /** Polarity score in [-1, 1] */
    polarity?: number;
    /** Confidence in [0, 1] */
    confidence?: number;
    product_id?: string;
    order_id?: string;
}

/** Normalize up to 3 HTTPS/Cloudinary image URLs with legacy field fallbacks. */
function normalizeImageList(
    images?: string[] | null,
    imageUrls?: string[] | null,
    productImageUrl?: string | null,
): string[] {
    const fromArrays = [
        ...(Array.isArray(imageUrls) ? imageUrls : []),
        ...(Array.isArray(images) ? images : []),
    ]
        .map((u) => String(u || "").trim())
        .filter(Boolean);
    const primary = String(productImageUrl || "").trim();
    const merged = primary && !fromArrays.includes(primary) ? [primary, ...fromArrays] : fromArrays;
    const unique = [...new Set(merged)].slice(0, 3);
    return unique.length > 0 ? unique : [];
}

function nextProductKey(existingKeys: string[]): string {
    let max = 0;
    for (const key of existingKeys) {
        const match = /^prod_(\d+)$/i.exec(key);
        if (match) max = Math.max(max, Number(match[1]));
    }
    return `prod_${max + 1}`;
}

function dayIdFromDate(date = new Date()): string {
    return `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, "0")}_${String(date.getDate()).padStart(2, "0")}`;
}

export interface Step1PersonalData {
    fullName: string;
    email: string;
    password?: string;
}

export interface Step3BusinessData {
    businessName: string;
    operationalLocation: string;
    exactLocation: string;
    coreCategory: string;
    subcategory: string;
    teamSize: string;
    trademarkNumber?: string;
    pitch: string;
    phone: string;
    cnic: string;
}

export interface KYCImages {
    cnicFrontUrl: string;
    cnicBackUrl: string;
    selfieUrl: string;
}

export class BusinessOwnerService {

    /**
     * STEP 1: Email uniqueness check first. Creates Auth, locks email, triggers Verification Mail.
     */
    static async registerStep1(data: Step1PersonalData): Promise<{ success: boolean; uid: string }> {
        const { email, password, fullName } = data;
        if (!password) throw new Error("Password is required to proceed.");

        const sanitizedEmail = email.toLowerCase().replace(/\./g, "_");

        // Pre-emptively check Database to prevent unnecessary Auth creation
        const emailRef = ref(db, `registered_emails/${sanitizedEmail}`);
        const emailSnap = await get(emailRef);

        if (emailSnap.exists()) {
            throw new Error("Email is already in use!");
        }

        // Create Firebase User Instance
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user: User = userCredential.user;
        const uid = user.uid;

        // Send Verification Email
        await sendEmailVerification(user);

        // Save Basic Profile and Lock Email
        await Promise.all([
            set(ref(db, `users/${uid}`), {
                uid,
                fullName,
                email,
                role: "business_owner",
                kycStatus: "unverified",
                emailVerified: false,
                stepCompleted: 1,
                createdAt: Date.now()
            }),
            set(ref(db, `registered_emails/${sanitizedEmail}`), { uid, role: "business_owner" })
        ]);

        return { success: true, uid };
    }

    /**
     * STEP 3: Saves Business Details. Checks unique Phone & CNIC (No subdomain created yet).
     */
    static async registerStep3(uid: string, data: Step3BusinessData): Promise<{ success: boolean }> {
        const {
            businessName, operationalLocation, exactLocation,
            coreCategory, subcategory, teamSize, trademarkNumber, pitch, phone, cnic
        } = data;

        const formattedPhone = phone.trim();
        const formattedCnic = cnic.replace(/[^0-9]/g, "");

        // Validation Checks
        const [phoneSnap, cnicSnap] = await Promise.all([
            get(ref(db, `registered_phones/${formattedPhone}`)),
            get(ref(db, `registered_cnics/${formattedCnic}`))
        ]);

        if (phoneSnap.exists()) {
            throw new Error("This phone number is already registered.");
        }
        if (cnicSnap.exists()) {
            throw new Error("This CNIC is already registered.");
        }

        // Update Core Profile and save Business metadata
        await Promise.all([
            update(ref(db, `users/${uid}`), {
                phone: formattedPhone,
                cnic: formattedCnic,
                stepCompleted: 3
            }),
            set(ref(db, `registered_phones/${formattedPhone}`), { uid, role: "business_owner" }),
            set(ref(db, `registered_cnics/${formattedCnic}`), { uid, role: "business_owner" }),
            set(ref(db, `business_owners/${uid}`), {
                profile: {
                    businessName,
                    operationalLocation,
                    exactLocation,
                    coreCategory,
                    subcategory,
                    teamSize,
                    trademarkNumber: trademarkNumber || null,
                    pitch,
                    created_at: Date.now()
                },
                dashboard_stats: {
                    visitor_count: 0,
                    total_products: 0,
                    total_reviews: 0,
                    total_revenue: 0,
                    gross_profit: 0,
                    net_profit: 0,
                    final_net_profit: 0,
                    operational_cost: 0,
                    total_orders_pending: 0,
                },
                website_settings: {
                    theme_color: "#3b82f6",
                    background_color: "#f8fafc",
                    text_color: "#1e293b",
                    heading_color: "#0f172a",
                    hero_background: "#0f172a",
                    font_family: "modern",
                    card_background: "#ffffff",
                    nav_background: "#ffffff",
                    banner_title: `Welcome to ${businessName}`,
                    banner_description: pitch,
                    banner_image_url: "",
                    isWebsiteCreated: false,
                },
                products: {},
                reviews: {}
            })
        ]);

        return { success: true };
    }

    /**
     * STEP 4: Persists KYC Document paths.
     */
    static async registerStep4(uid: string, images: KYCImages): Promise<{ success: boolean }> {
        await Promise.all([
            update(ref(db, `users/${uid}`), {
                kycStatus: "pending",
                stepCompleted: 4
            }),
            set(ref(db, `business_owners/${uid}/kyc_documents`), {
                ...images,
                submittedAt: Date.now()
            })
        ]);

        return { success: true };
    }

    /**
     * STEP 5 (Post-AI Prompt): Auto-generates clean subdomain slugs, checks global availability,
     * saves website configurations, and provisions global routing mappings.
     */
    static async finalizeAiGeneratedWebsite(
        uid: string,
        businessName: string,
        aiGeneratedSettings: any,
        aiProducts: any
    ): Promise<{ success: boolean; subdomain: string }> {

        // Create Safe Slug URL (e.g., "Luna Baker's Shop" -> "luna-bakers-shop")
        let baseSlug = businessName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");

        let finalSubdomain = baseSlug;
        let counter = 1;

        // Check availability of subdomain recursively
        let isUnique = false;
        while (!isUnique) {
            const subdomainRef = ref(db, `subdomains/${finalSubdomain}`);
            const snap = await get(subdomainRef);

            if (!snap.exists()) {
                isUnique = true;
            } else {
                finalSubdomain = `${baseSlug}-${counter}`;
                counter++;
            }
        }

        // Atomically write Website Settings and Provision Global Subdomain Lookup
        await Promise.all([
            update(ref(db, `business_owners/${uid}/profile`), {
                subdomain: finalSubdomain
            }),
            update(ref(db, `business_owners/${uid}/website_settings`), {
                theme_color: aiGeneratedSettings.theme_color,
                background_color: aiGeneratedSettings.background_color || "#f8fafc",
                text_color: aiGeneratedSettings.text_color || "#1e293b",
                heading_color: aiGeneratedSettings.heading_color || "#0f172a",
                hero_background: aiGeneratedSettings.hero_background || "#0f172a",
                font_family: aiGeneratedSettings.font_family || "modern",
                card_background: aiGeneratedSettings.card_background || "#ffffff",
                nav_background: aiGeneratedSettings.nav_background || "#ffffff",
                banner_title: aiGeneratedSettings.banner_title,
                banner_description: aiGeneratedSettings.banner_description,
                banner_image_url: aiGeneratedSettings.banner_image_url || "",
                isWebsiteCreated: true,
                subdomain: finalSubdomain,
                publishedUrl: `/site/${finalSubdomain}`,
            }),
            set(ref(db, `business_owners/${uid}/products`), aiProducts),
            set(ref(db, `subdomains/${finalSubdomain}`), {
                owner_uid: uid,
                createdAt: Date.now()
            }),
            set(ref(db, `business_owners/${uid}/dashboard_stats`), {
                visitor_count: 0,
                total_reviews: 0,
                total_revenue: 0,
                gross_profit: 0,
                net_profit: 0,
                final_net_profit: 0,
                operational_cost: 0,
                total_orders_pending: 0,
            })
        ]);

        return { success: true, subdomain: finalSubdomain };
    }

    /**
     * Creates a new order from the customer-facing template website.
     */
    static async createCustomerOrder(uid: string, orderData: any): Promise<string> {
        const ordersRef = ref(db, `business_owners/${uid}/orders`);
        const newOrderRef = push(ordersRef);
        const orderId = newOrderRef.key;
        if (!orderId) throw new Error("Failed to allocate a unique order ID.");

        await set(newOrderRef, {
            ...orderData,
            id: orderId,
            status: "pending",
            createdAt: Date.now()
        });

        // Increment pending counter on dashboard stats (transaction-safe)
        const statsRef = ref(db, `business_owners/${uid}/dashboard_stats/total_orders_pending`);
        await runTransaction(statsRef, (current) => (typeof current === "number" ? current + 1 : 1));

        return orderId;
    }

    /**
     * Accept or Decline Order. On accept, emails the customer their unique OrderNumber.
     */
    static async updateOrderStatus(uid: string, orderId: string, action: "accept" | "decline"): Promise<boolean> {
        const orderRef = ref(db, `business_owners/${uid}/orders/${orderId}`);
        const orderSnap = await get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found.");

        const orderData = orderSnap.val();
        const status = action === "accept" ? "accepted" : "declined";

        // Update order status in DB
        await update(orderRef, { status, statusUpdatedAt: Date.now() });

        // Update Stats: Decrement pending order count
        const pendingRef = ref(db, `business_owners/${uid}/dashboard_stats/total_orders_pending`);
        await runTransaction(pendingRef, (current) => {
            if (typeof current !== "number" || current <= 0) return 0;
            return current - 1;
        });

        try {
            const { sendOrderStatusEmail } = await import("../lib/orderEmailService");
            let businessName = "";
            let storefrontUrl = "";
            try {
                const profileSnap = await get(ref(db, `business_owners/${uid}/profile`));
                if (profileSnap.exists()) {
                    const prof = profileSnap.val();
                    businessName = prof.businessName || prof.business_name || "";
                    if (prof.subdomain) {
                        const origin = typeof window !== "undefined" ? window.location.origin : "https://smartbiz.com";
                        storefrontUrl = `${origin}/site/${prof.subdomain}`;
                    }
                }
            } catch {
                /* optional */
            }
            await sendOrderStatusEmail({
                ownerUid: uid,
                orderId,
                customerName: orderData.customer_name || "Customer",
                customerEmail: orderData.customer_email || "",
                status,
                totalAmount: Number(orderData.total_amount) || 0,
                businessName,
                storefrontUrl,
            });
        } catch (emailErr) {
            console.warn("[orders] Email notification failed (status still updated):", emailErr);
        }

        return true;
    }

    /**
     * Mark as Delivered and shift numbers to Dashboard Financial Analytics & Net Profit calculation.
     */
    static async markOrderAsDelivered(uid: string, orderId: string): Promise<boolean> {
        const orderRef = ref(db, `business_owners/${uid}/orders/${orderId}`);
        const orderSnap = await get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found.");

        const orderData = orderSnap.val();
        if (orderData.status !== "accepted") throw new Error("Only accepted orders can be marked as delivered.");

        // Mark status as delivered
        await update(orderRef, { status: "delivered", deliveredAt: Date.now() });

        // Public review-unlock token (customers cannot read private orders/)
        const productIds: string[] = [];
        if (orderData.items) {
            Object.keys(orderData.items).forEach((key) => {
                const pid = String(orderData.items[key]?.product_id || "").trim();
                if (pid) productIds.push(pid);
            });
        }
        await set(ref(db, `business_owners/${uid}/review_unlocks/${orderId}`), {
            status: "delivered",
            product_ids: productIds,
            customer_email: orderData.customer_email || "",
            unlockedAt: Date.now(),
        });

        try {
            const { sendOrderStatusEmail } = await import("../lib/orderEmailService");
            let businessName = "";
            let storefrontUrl = "";
            try {
                const profileSnap = await get(ref(db, `business_owners/${uid}/profile`));
                if (profileSnap.exists()) {
                    const prof = profileSnap.val();
                    businessName = prof.businessName || prof.business_name || "";
                    if (prof.subdomain) {
                        const origin = typeof window !== "undefined" ? window.location.origin : "https://smartbiz.com";
                        storefrontUrl = `${origin}/site/${prof.subdomain}`;
                    }
                }
            } catch {
                /* optional */
            }
            await sendOrderStatusEmail({
                ownerUid: uid,
                orderId,
                customerName: orderData.customer_name || "Customer",
                customerEmail: orderData.customer_email || "",
                status: "delivered",
                totalAmount: Number(orderData.total_amount) || 0,
                businessName,
                storefrontUrl,
            });
        } catch (emailErr) {
            console.warn("[orders] Delivery email failed:", emailErr);
        }

        // Extract financial variables
        const orderRevenue = orderData.total_amount;
        
        // Calculate product costs to calculate net profit dynamically
        let totalProductCost = 0;
        if (orderData.items) {
            Object.keys(orderData.items).forEach((key) => {
                const item = orderData.items[key];
                // Prefer real_price/product_cost from order snapshot; fallback 40% of selling price
                const unitCost = item.real_price ?? item.product_cost ?? (item.price * 0.4); 
                totalProductCost += unitCost * item.quantity;
            });
        }

        const orderNetProfit = orderRevenue - totalProductCost;

        // Generate Date IDs for Ledger (e.g. "2026_07_17")
        const dateObj = new Date();
        const yearMonth = `${dateObj.getFullYear()}_${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        const dayId = `${yearMonth}_${String(dateObj.getDate()).padStart(2, '0')}`;

        // Read current Day ledger
        const dayLedgerRef = ref(db, `business_owners/${uid}/financials/daily_ledger/${dayId}`);
        const daySnap = await get(dayLedgerRef);

        let currentDayRevenue = 0;
        let currentDayCost = 0;
        let currentDayProfit = 0;

        if (daySnap.exists()) {
            const dayData = daySnap.val();
            currentDayRevenue = dayData.revenue || 0;
            currentDayCost = dayData.product_cost_total || 0;
            currentDayProfit = dayData.net_profit || 0;
        }

        // Update daily ledger
        await set(dayLedgerRef, {
            revenue: currentDayRevenue + orderRevenue,
            product_cost_total: currentDayCost + totalProductCost,
            net_profit: currentDayProfit + orderNetProfit
        });

        // Update Master Dashboard Statistics
        // net_profit field = Gross Profit from delivered sales (revenue − product cost)
        const statsRef = ref(db, `business_owners/${uid}/dashboard_stats`);
        const statsSnap = await get(statsRef);
        if (statsSnap.exists()) {
            const currentStats = statsSnap.val();
            const grossProfit = (currentStats.net_profit || currentStats.gross_profit || 0) + orderNetProfit;
            const opCost = Number(currentStats.operational_cost || 0);
            await update(statsRef, {
                total_revenue: (currentStats.total_revenue || 0) + orderRevenue,
                gross_profit: grossProfit,
                net_profit: grossProfit, // legacy key = gross profit from deliveries
                final_net_profit: grossProfit - opCost,
            });
        }

        return true;
    }

    /** Manual operational cost for Net Profit = Gross Profit − Op Cost */
    static async updateOperationalCost(uid: string, amount: number): Promise<void> {
        const statsRef = ref(db, `business_owners/${uid}/dashboard_stats`);
        const snap = await get(statsRef);
        const current = snap.exists() ? snap.val() : {};
        const gross = Number(current.gross_profit ?? current.net_profit ?? 0);
        const op = Math.max(0, Number(amount) || 0);
        await update(statsRef, {
            operational_cost: op,
            gross_profit: gross,
            final_net_profit: gross - op,
        });
    }

    /** Persist banner title/description to website_settings. */
    static async updateWebsiteSettings(
        uid: string,
        settings: Partial<WebsiteSettings>
    ): Promise<void> {
        await update(ref(db, `business_owners/${uid}/website_settings`), settings);
    }

    /** Create a new product under products/prod_N with canonical fields. */
    static async addProduct(
        uid: string,
        data: {
            name: string;
            description: string;
            sale_price: number;
            real_price: number;
            original_price?: number;
            quantity?: number;
            images?: string[];
            imageUrls?: string[];
            productImageUrl?: string;
        }
    ): Promise<string> {
        const productsRef = ref(db, `business_owners/${uid}/products`);
        const snap = await get(productsRef);
        const existing = snap.exists() ? Object.keys(snap.val()) : [];
        const id = nextProductKey(existing);
        const images = normalizeImageList(data.images, data.imageUrls, data.productImageUrl);
        const product: CanonicalProduct = {
            id,
            name: data.name.trim(),
            description: data.description.trim(),
            sale_price: Number(data.sale_price) || 0,
            real_price: Number(data.real_price) || 0,
            original_price: Number((data as any).original_price) || Number(data.sale_price) || 0,
            quantity: data.quantity ?? 50,
            images,
            imageUrls: images,
            productImageUrl: images[0] || "",
        };
        await set(ref(db, `business_owners/${uid}/products/${id}`), product);
        return id;
    }

    /** Update fields on an existing product key. */
    static async updateProduct(
        uid: string,
        productId: string,
        data: Partial<CanonicalProduct>
    ): Promise<void> {
        const patch: Partial<CanonicalProduct> = { ...data };
        if (data.images || data.imageUrls || data.productImageUrl !== undefined) {
            const images = normalizeImageList(data.images, data.imageUrls, data.productImageUrl);
            patch.images = images;
            patch.imageUrls = images;
            patch.productImageUrl = images[0] || "";
        }
        await update(ref(db, `business_owners/${uid}/products/${productId}`), patch);
    }

    /** Delete a product key. */
    static async deleteProduct(uid: string, productId: string): Promise<void> {
        await remove(ref(db, `business_owners/${uid}/products/${productId}`));
    }

    /**
     * Submit one product-specific review for a delivered order.
     * Requires OrderNumber whose status is DELIVERED; runs NLP sentiment and persists it.
     * The order ID is the review key, preventing duplicate reviews per order.
     */
    static async submitDeliveredProductReview(
        ownerUid: string,
        productId: string,
        orderId: string,
        payload: { name: string; rating: number; text: string }
    ): Promise<void> {
        const cleanOrderId = orderId.trim().replace(/^#/, "");
        if (!cleanOrderId) {
            throw new Error("Please enter your Order Number to submit a verified review.");
        }

        // Prefer public review_unlocks (readable by customers); fall back to orders/ for owners
        const unlockSnap = await get(ref(db, `business_owners/${ownerUid}/review_unlocks/${cleanOrderId}`));
        let orderStatus = "";
        let orderedProductIds: string[] = [];

        if (unlockSnap.exists()) {
            const unlock = unlockSnap.val();
            orderStatus = String(unlock.status || "").toLowerCase();
            orderedProductIds = Array.isArray(unlock.product_ids)
                ? unlock.product_ids.map((id: string) => String(id).trim()).filter(Boolean)
                : [];
        } else {
            try {
                const orderSnap = await get(ref(db, `business_owners/${ownerUid}/orders/${cleanOrderId}`));
                if (!orderSnap.exists()) {
                    throw new Error("Order Number not found. Check the ID from your confirmation email.");
                }
                const orderData = orderSnap.val();
                orderStatus = String(orderData.status || "").toLowerCase();
                const items = orderData.items || {};
                orderedProductIds = Object.values(items)
                    .map((item: any) => String(item?.product_id || "").trim())
                    .filter(Boolean);
            } catch (err: any) {
                if (err?.message?.includes("Order Number not found")) throw err;
                // Private orders unreadable to guests — write rules will still enforce delivery
                orderStatus = "";
            }
        }

        if (orderStatus && orderStatus !== "delivered") {
            throw new Error(
                "Reviews can only be submitted after your order has been marked as delivered."
            );
        }

        if (orderedProductIds.length > 0 && !orderedProductIds.includes(productId)) {
            throw new Error(
                "This Order Number does not include the selected product. Use the Order Number from that purchase."
            );
        }

        const rating = Math.min(5, Math.max(1, Math.round(Number(payload.rating) || 5)));
        const reviewText = payload.text.trim();
        if (!reviewText) {
            throw new Error("Please write your review before submitting.");
        }

        const reviewRef = ref(
            db,
            `business_owners/${ownerUid}/products/${productId}/reviews/${cleanOrderId}`
        );
        const existingReview = await get(reviewRef);
        if (existingReview.exists()) {
            throw new Error("A review for this product order already exists.");
        }

        const { analyzeSentimentWithGroq, analyzeReviewSentiment } = await import("../lib/sentimentAnalysis");
        let nlp;
        try {
            nlp = await analyzeSentimentWithGroq(reviewText);
        } catch {
            nlp = analyzeReviewSentiment(reviewText, rating);
        }

        const sentimentLabel = nlp.sentiment || nlp.label || "NEUTRAL";
        const polarityVal = typeof nlp.polarityScore === "number" ? nlp.polarityScore : (nlp.polarity ?? 0);
        const confidenceVal = typeof nlp.confidence === "number" ? nlp.confidence : 0.8;

        const review: ProductReview = {
            customer_name: payload.name.trim() || "Customer",
            rating,
            review_text: reviewText,
            timestamp: Date.now(),
            sentiment: sentimentLabel as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
            polarity: polarityVal,
            confidence: confidenceVal,
            product_id: productId,
            order_id: cleanOrderId,
        };

        try {
            await set(reviewRef, review);
        } catch (err: any) {
            const msg = String(err?.message || "");
            if (msg.includes("PERMISSION_DENIED") || err?.code === "PERMISSION_DENIED") {
                throw new Error(
                    "Reviews can only be submitted after your order has been marked as delivered."
                );
            }
            throw new Error(err.message || "Failed to submit review.");
        }
    }

    /** Record one unique visit per browser session/day under visitor_daily. */
    static async recordStorefrontVisit(ownerUid: string): Promise<void> {
        if (typeof window === "undefined") return;
        const dayId = dayIdFromDate();
        const sessionKey = `sbip_visit_${ownerUid}_${dayId}`;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, "1");

        const dailyRef = ref(db, `business_owners/${ownerUid}/visitor_daily/${dayId}`);
        await runTransaction(dailyRef, (current) =>
            typeof current === "number" ? current + 1 : 1
        );

        const totalRef = ref(db, `business_owners/${ownerUid}/dashboard_stats/visitor_count`);
        await runTransaction(totalRef, (current) =>
            typeof current === "number" ? current + 1 : 1
        );
    }
}

/**
 * Backward compatibility wrapper to support single-step UI flow registration
 * while utilizing the new multi-step BusinessOwnerService functions under the hood.
 */
export const registerBusinessOwner = async (userData: any): Promise<{ success: boolean; uid: string }> => {
    // Step 1: Create auth and base profile
    const step1Result = await BusinessOwnerService.registerStep1({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName
    });
    const uid = step1Result.uid;

    // Step 3: Business metadata & unique phone/cnic locks
    await BusinessOwnerService.registerStep3(uid, {
        businessName: userData.businessName,
        operationalLocation: userData.location || "Karachi",
        exactLocation: userData.exactLocation || "",
        coreCategory: userData.category || "Food & Beverage",
        subcategory: userData.subcategory || "General",
        teamSize: userData.size || "2–10 members",
        trademarkNumber: userData.trademark || "",
        pitch: userData.about || "",
        phone: userData.phone,
        cnic: userData.cnic
    });

    // Step 4: KYC Biometrics
    await BusinessOwnerService.registerStep4(uid, {
        cnicFrontUrl: userData.cnicFront || "CNIC_FRONT_VERIFIED.PNG",
        cnicBackUrl: userData.cnicBack || "CNIC_BACK_VERIFIED.PNG",
        selfieUrl: userData.liveSelfie || "LIVE_SELFIE_MATCHED.JPG"
    });

    // Step 5: Subdomain generation and finalization
    await BusinessOwnerService.finalizeAiGeneratedWebsite(
        uid,
        userData.businessName,
        {
            theme_color: "#3b82f6",
            banner_title: `Welcome to ${userData.businessName}`,
            banner_description: userData.about || `A premium ${userData.category} business based in ${userData.location}.`,
            banner_image_url: ""
        },
        {}
    );

    return { success: true, uid };
}
