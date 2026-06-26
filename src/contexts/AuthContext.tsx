import React, { createContext, useContext, useEffect, useState } from "react";
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
  ENTREPRENEUR: "entrepreneur",
  INVESTOR: "investor",
  WHOLESALER: "wholesaler",
  BUSINESS_OWNER: "business_owner",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/** Maps a role to its dedicated Realtime Database collection path. */
const ROLE_COLLECTION: Record<UserRole, string> = {
  entrepreneur: "entrepreneurs",
  investor: "investors",
  wholesaler: "wholesalers",
  business_owner: "users",
};

function roleProfilePath(role: UserRole, uid: string): string | null {
  if (role === "business_owner") return `users/${uid}/business`;
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
  const snapshot = await get(ref(database, `users/${uid}`));
  return snapshot.exists() ? (snapshot.val() as AppUserData) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUserData | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Full signup: creates the auth user, writes the shared profile to
   * /users/{uid}, and writes role-specific data to the matching collection
   * (/entrepreneurs, /investors, /wholesalers, /businesses).
   */
  async function signupUser({
    email,
    password,
    name,
    role,
    profile = {},
  }: SignupUserInput): Promise<User> {
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

    setUserData(baseProfile);
    void syncPlatformStatsToRtdb();
    return user;
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
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  }

  function logout(): Promise<void> {
    return signOut(auth);
  }

  async function refreshUserData(uid: string): Promise<AppUserData | null> {
    const data = await fetchUserData(uid);
    setUserData(data);
    return data;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const data = await fetchUserData(user.uid);
          setUserData(data);
          const pointsSnap = await get(ref(database, `points/${user.uid}/points`));
          if (pointsSnap.exists()) {
            setGlobalPoints(Number(pointsSnap.val()));
          }
          void syncPlatformStatsToRtdb();
        } catch (err) {
          console.warn("Failed to load user data from RTDB:", err);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      setLoading(false);
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

  // Always render children — the app's primary session lives in useAppState
  // (localStorage). Components that need Firebase auth can read `loading`.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
