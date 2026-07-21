import { useState } from "react";
import { sendEmailVerification, reload } from "firebase/auth";
import { Mail, Lock, User, Loader2, X } from "lucide-react";
import { useAuth, USER_ROLES } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "register" | "login";

type Props = {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  /** Inline panel (always visible) vs modal overlay */
  variant?: "modal" | "panel";
  title?: string;
};

function persistCommunitySession(uid: string, name: string, email: string) {
  try {
    localStorage.setItem(
      "smartbiz_community_session",
      JSON.stringify({ uid, role: "community_member", name, email, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

export function clearCommunitySession() {
  try {
    localStorage.removeItem("smartbiz_community_session");
  } catch {
    /* ignore */
  }
}

export function CommunityGuestAuthPanel({
  open,
  onClose,
  onAuthenticated,
  variant = "modal",
  title = "Join Community",
}: Props) {
  const { signupUser, login, currentUser, refreshUserData } = useAuth();
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingVerify, setAwaitingVerify] = useState(false);

  if (!open && variant === "modal") return null;

  const finishAuth = async (uid: string, displayName: string, mail: string) => {
    persistCommunitySession(uid, displayName, mail);
    await refreshUserData(uid);
    onAuthenticated();
    onClose();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      toast.error("Full name, valid email, and password (6+ chars) required.");
      return;
    }
    setBusy(true);
    try {
      const user = await signupUser({
        email: email.trim(),
        password,
        name: name.trim(),
        role: USER_ROLES.COMMUNITY_MEMBER,
      });
      void sendEmailVerification(user).catch(() => {});
      persistCommunitySession(user.uid, name.trim(), email.trim());
      toast.success("Welcome! You can like & comment now. We also sent a verification email.");
      await finishAuth(user.uid, name.trim(), email.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed";
      toast.error(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim() || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password required.");
      return;
    }
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      await reload(user);
      const data = await refreshUserData(user.uid);
      const display = String(data?.name || name || email.split("@")[0]);
      persistCommunitySession(user.uid, display, email.trim());
      if (!user.emailVerified) {
        setAwaitingVerify(true);
        toast.message("Logged in. Verify email when you can — liking & commenting are enabled.");
      } else {
        toast.success("Welcome back to Community Lounge.");
      }
      await finishAuth(user.uid, display, email.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast.error(msg.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "").trim() || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!currentUser) {
      toast.error("Log in first, then resend verification.");
      return;
    }
    setBusy(true);
    try {
      await sendEmailVerification(currentUser);
      toast.success("Verification email sent again.");
    } catch {
      toast.error("Could not resend verification email.");
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div
      className={
        variant === "modal"
          ? "relative w-full max-w-md rounded-2xl border border-[#FFD700]/30 bg-[#1a1a2e] p-6 shadow-2xl"
          : "mb-6 rounded-2xl border border-[#FFD700]/25 bg-white/5 p-5"
      }
    >
      {variant === "modal" && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[#FFD700]">{title}</p>
      <p className="mb-4 text-xs text-slate-400">
        Full name, email &amp; password. Community members can like &amp; comment. Posting is for Business Owners,
        Founders &amp; Investors.
      </p>

      {awaitingVerify && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Check your inbox to verify email.
          <button type="button" className="ml-2 font-bold underline" onClick={handleResend} disabled={busy}>
            Resend
          </button>
        </div>
      )}

      <div className="mb-4 flex gap-2 rounded-xl bg-black/20 p-1">
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold ${mode === "register" ? "bg-[#FFD700] text-[#1a1a2e]" : "text-slate-400"}`}
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg py-2 text-xs font-bold ${mode === "login" ? "bg-[#FFD700] text-[#1a1a2e]" : "text-slate-400"}`}
        >
          Log in
        </button>
      </div>

      <form onSubmit={mode === "register" ? handleRegister : handleLogin} className="space-y-3">
        {mode === "register" && (
          <div className="space-y-1">
            <Label className="text-[10px] text-slate-400">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="h-9 border-[#FFD700]/30 bg-white/5 pl-9 text-white"
                required
              />
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="h-9 border-[#FFD700]/30 bg-white/5 pl-9 text-white"
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-400">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="h-9 border-[#FFD700]/30 bg-white/5 pl-9 text-white"
              required
              minLength={6}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={busy}
          className="w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] font-bold text-[#1a1a2e]"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "register" ? (
            "Create community account"
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </div>
  );

  if (variant === "panel") return body;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{body}</div>
    </div>
  );
}
