import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "../firebase";
import { setGlobalPoints } from "@/hooks/useAppState";
import { syncPlatformStatsToRtdb } from "@/services/platformStatsService";

export const USER_ROLES = {
  FOUNDER: "founder",
  ENTREPRENEUR: "entrepreneur",
  INVESTOR: "investor",
  WHOLESALER: "wholesaler",
  BUSINESS_OWNER: "business_owner",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Maps a role to its dedicated Realtime Database collection path. */
const ROLE_COLLECTION: Record<UserRole, string> = {
  founder: "founders",
  entrepreneur: "entrepreneurs",
  investor: "investors",
  wholesaler: "wholesalers",
  business_owner: "users",
};

function roleProfilePath(role: UserRole, uid: string): string | null {
  if (role === "founder") return `founders/${uid}/profile`;
  if (role === "business_owner") return `business_owners/${uid}/profile`;
  if (role === "investor") return `investors/${uid}/profile`;
  const collection = ROLE_COLLECTION[role];
  return collection ? `${collection}/${uid}` : null;
}

export type AppUserData = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: number;
  [key: string]: unknown;
};

export type SignupUserInput = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  /** Optional role-specific profile fields saved under /entrepreneurs, /investors, etc. */
  profile?: Record<string, unknown>;
};

interface AuthContextType {
  currentUser: User | null;
  userData: AppUserData | null;
  loading: boolean;
  roles: typeof USER_ROLES;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<User>;
  signupUser: (input: SignupUserInput) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUserData: (uid: string) => Promise<AppUserData | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

async function fetchUserData(uid: string): Promise<AppUserData | null> {
  try {
    // Founders: authoritative metadata lives under founders/{uid}/profile
    const founderSnap = await get(ref(database, `founders/${uid}/profile`));
    if (founderSnap.exists()) {
      const profile = founderSnap.val() as Record<string, unknown>;
      return {
        uid,
        name: String(profile.fullName ?? profile.name ?? ""),
        email: String(profile.email ?? ""),
        role: "founder",
        createdAt: Number(profile.createdAt ?? Date.now()),
        ...profile,
      };
    }

    // Investors: prefer isolated profile node
    try {
      const invSnap = await get(ref(database, `investors/${uid}/profile`));
      if (invSnap.exists()) {
        const profile = invSnap.val() as Record<string, unknown>;
        return {
          uid,
          name: String(profile.fullName ?? profile.name ?? ""),
          email: String(profile.email ?? ""),
          role: "investor",
          createdAt: Number(profile.createdAt ?? Date.now()),
        };
      }
    } catch {
      /* non-fatal */
    }

    const snapshot = await get(ref(database, `users/${uid}`));
    if (!snapshot.exists()) return null;
    const data = snapshot.val() as AppUserData;

    // Legacy entrepreneur role must still resolve via nested founders profile
    if (data.role === "entrepreneur" || data.role === "founder") {
      return null;
    }

    // Business owners: display name lives under business_owners/{uid}/profile.businessName
    if (data.role === "business_owner") {
      try {
        const ownerSnap = await get(ref(database, `business_owners/${uid}/profile`));
        if (ownerSnap.exists()) {
          const profile = ownerSnap.val() as Record<string, unknown>;
          const businessName = String(
            profile.businessName ?? profile.fullName ?? profile.storeName ?? "",
          ).trim();
          return {
            ...data,
            uid,
            name:
              businessName ||
              String(data.fullName ?? data.name ?? "").trim() ||
              "My Business Store",
            email: String(data.email ?? ""),
            role: "business_owner",
            createdAt: Number(data.createdAt ?? Date.now()),
            businessName: businessName || undefined,
            fullName: String(data.fullName ?? profile.fullName ?? ""),
          };
        }
      } catch {
        /* non-fatal */
      }
    }

    return {
      ...data,
      name: String(data.name ?? data.fullName ?? "").trim(),
      email: String(data.email ?? ""),
    };
  } catch (err) {
    console.warn("fetchUserData failed:", err);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUserData | null>(null);
  const [loading, setLoading] = useState(true);

  /** Last known credentials — survive transient multi-tab auth flickers */
  const lastUserRef = useRef<User | null>(null);
  const lastUserDataRef = useRef<AppUserData | null>(null);
  /** Cleared only when logout() intentionally calls signOut */
  const intentionalLogoutRef = useRef(false);

  /**
   * Full signup. Founders: Firebase Auth only — profile lives under founders/{uid}/…
   */
  async function signupUser({
    email,
    password,
    name,
    role,
    profile = {},
  }: SignupUserInput): Promise<User> {
    try {
      intentionalLogoutRef.current = false;
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      const createdAt = Date.now();

      const baseProfile: AppUserData = {
        uid: user.uid,
        name,
        email,
        role,
        createdAt,
      };

      if (role === "founder") {
        await set(
          ref(database, `founders/${user.uid}/profile`),
          stripUndefined({
            uid: user.uid,
            fullName: name,
            email,
            role: "founder",
            createdAt,
            ...profile,
          }),
        );
        lastUserRef.current = user;
        lastUserDataRef.current = baseProfile;
        setCurrentUser(user);
        setUserData(baseProfile);
        void syncPlatformStatsToRtdb();
        return user;
      }

      if (role === "investor") {
        // Profile write is handled by InvestorOnboarding → commitInvestorProfile
        lastUserRef.current = user;
        lastUserDataRef.current = baseProfile;
        setCurrentUser(user);
        setUserData(baseProfile);
        void syncPlatformStatsToRtdb();
        return user;
      }

      await set(ref(database, `users/${user.uid}`), baseProfile);

      await set(ref(database, `user_directory/${user.uid}`), {
        uid: user.uid,
        name,
        email,
        role,
        createdAt,
      });

      const profilePath = roleProfilePath(role, user.uid);
      if (profilePath) {
        await set(
          ref(database, profilePath),
          stripUndefined({
            uid: user.uid,
            name,
            email,
            role,
            createdAt,
            ...profile,
          }),
        );
      }

      lastUserRef.current = user;
      lastUserDataRef.current = baseProfile;
      setCurrentUser(user);
      setUserData(baseProfile);
      void syncPlatformStatsToRtdb();
      return user;
    } catch (error) {
      console.error("signupUser failed:", error);
      throw error;
    }
  }

  /** Lightweight signup kept for backwards compatibility with existing callers. */
  async function signup(
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ): Promise<User> {
    return signupUser({ email, password, name, role });
  }

  async function login(email: string, password: string): Promise<User> {
    intentionalLogoutRef.current = false;
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  async function logout(): Promise<void> {
    intentionalLogoutRef.current = true;
    try {
      await signOut(auth);
      lastUserRef.current = null;
      lastUserDataRef.current = null;
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      intentionalLogoutRef.current = false;
      console.error("logout failed:", error);
      throw error;
    }
  }

  async function refreshUserData(uid: string): Promise<AppUserData | null> {
    try {
      const data = await fetchUserData(uid);
      if (data) {
        lastUserDataRef.current = data;
        setUserData(data);
      }
      return data;
    } catch (error) {
      console.warn("refreshUserData failed:", error);
      return lastUserDataRef.current;
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          // Hard logout only — ignore null events during multi-tab token refresh
          if (intentionalLogoutRef.current) {
            lastUserRef.current = null;
            lastUserDataRef.current = null;
            setCurrentUser(null);
            setUserData(null);
            intentionalLogoutRef.current = false;
          } else if (lastUserRef.current) {
            console.warn(
              "Auth null event ignored (no deliberate logout) — keeping cached session credentials.",
            );
            setCurrentUser(lastUserRef.current);
            if (lastUserDataRef.current) setUserData(lastUserDataRef.current);
          } else {
            setCurrentUser(null);
            setUserData(null);
          }
          setLoading(false);
          return;
        }

        intentionalLogoutRef.current = false;
        // Always track the live Auth UID — never keep a previous account after re-login
        if (lastUserRef.current && lastUserRef.current.uid !== user.uid) {
          lastUserDataRef.current = null;
          setUserData(null);
        }
        lastUserRef.current = user;
        setCurrentUser(user);

        try {
          const data = await fetchUserData(user.uid);
          if (data) {
            // Force uid field to match Auth — prevents detached node remapping
            const locked: AppUserData = { ...data, uid: user.uid };
            lastUserDataRef.current = locked;
            setUserData(locked);
          } else if (
            lastUserDataRef.current &&
            lastUserDataRef.current.uid === user.uid
          ) {
            // Keep previous role metadata for same uid if fetch briefly fails/empty
            setUserData(lastUserDataRef.current);
          } else {
            setUserData(null);
          }

          try {
            const pointsSnap = await get(ref(database, `points/${user.uid}/points`));
            if (pointsSnap.exists()) {
              setGlobalPoints(Number(pointsSnap.val()));
            }
          } catch {
            /* non-fatal */
          }
          void syncPlatformStatsToRtdb();
        } catch (err) {
          console.warn("Failed to load user data from RTDB:", err);
          if (
            lastUserDataRef.current &&
            lastUserDataRef.current.uid === user.uid
          ) {
            setUserData(lastUserDataRef.current);
          }
        }
      } catch (outerErr) {
        console.error("onAuthStateChanged handler error:", outerErr);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    roles: USER_ROLES,
    signup,
    signupUser,
    login,
    logout,
    refreshUserData,
  };

  // Always render children — local dashboard state lives in useAppState (localStorage).
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
