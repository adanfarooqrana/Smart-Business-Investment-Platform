import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Upload,
  Download,
  LogIn,
  UserPlus,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { db } from "@/firebase";
import { writeData, readData } from "@/database";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/test")({
  component: FirebaseTest,
});

const TEST_PATH = "connection_tests/ping";

function FirebaseTest() {
  const { currentUser, userData, signupUser, login, logout, roles } = useAuth();

  const [connected, setConnected] = useState<boolean | null>(null);
  const [writeResult, setWriteResult] = useState<string>("");
  const [readResult, setReadResult] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState<string>("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authMsg, setAuthMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 1. Live connection status via RTDB ".info/connected"
  useEffect(() => {
    const unsub = onValue(ref(db, ".info/connected"), (snap) => {
      setConnected(snap.val() === true);
    });
    return unsub;
  }, []);

  // 2. Test write
  const handleWrite = async () => {
    setBusy("write");
    setWriteResult("");
    try {
      const payload = {
        message: "Firebase connection OK",
        timestamp: Date.now(),
        by: currentUser?.email || "anonymous",
      };
      await writeData(TEST_PATH, payload);
      setWriteResult(`Written at ${new Date(payload.timestamp).toLocaleTimeString()}`);
    } catch (err) {
      setWriteResult(`Write failed: ${(err as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  // 3. Test read
  const handleRead = async () => {
    setBusy("read");
    setReadResult(null);
    try {
      const data = await readData(TEST_PATH);
      setReadResult(data ?? { info: "No data found at " + TEST_PATH });
    } catch (err) {
      setReadResult({ error: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  // 4. Auth — signup
  const handleSignup = async () => {
    setBusy("signup");
    setAuthMsg(null);
    try {
      await signupUser({
        email,
        password,
        name: name || email.split("@")[0],
        role: roles.ENTREPRENEUR,
      });
      setAuthMsg({ type: "ok", text: "Signup successful — you are now signed in." });
    } catch (err) {
      setAuthMsg({ type: "err", text: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  // 4. Auth — login
  const handleLogin = async () => {
    setBusy("login");
    setAuthMsg(null);
    try {
      await login(email, password);
      setAuthMsg({ type: "ok", text: "Login successful." });
    } catch (err) {
      setAuthMsg({ type: "err", text: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  const handleLogout = async () => {
    setBusy("logout");
    setAuthMsg(null);
    try {
      await logout();
      setAuthMsg({ type: "ok", text: "Logged out." });
    } catch (err) {
      setAuthMsg({ type: "err", text: (err as Error).message });
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E1] px-6 py-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #FFA500, #FFD700)" }}
          >
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Firebase Test</h1>
            <p className="text-sm text-slate-500">Connection, database & auth verification</p>
          </div>
        </div>

        {/* 1. Connection status */}
        <Section title="1. Connection Status">
          {connected === null ? (
            <Badge tone="muted" icon={<Loader2 className="h-4 w-4 animate-spin" />}>
              Checking…
            </Badge>
          ) : connected ? (
            <Badge tone="ok" icon={<CheckCircle2 className="h-4 w-4" />}>Connected</Badge>
          ) : (
            <Badge tone="err" icon={<XCircle className="h-4 w-4" />}>Disconnected</Badge>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Live from Realtime Database <code>.info/connected</code>
          </p>
        </Section>

        {/* 2 & 3. Write / Read */}
        <Section title="2 & 3. Database Write / Read">
          <div className="flex flex-wrap gap-3">
            <ActionButton onClick={handleWrite} loading={busy === "write"} icon={<Upload className="h-4 w-4" />}>
              Test Write
            </ActionButton>
            <ActionButton onClick={handleRead} loading={busy === "read"} icon={<Download className="h-4 w-4" />}>
              Test Read
            </ActionButton>
          </div>
          {writeResult && <p className="mt-3 text-sm text-slate-700">📝 {writeResult}</p>}
          {readResult && (
            <pre className="mt-3 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-emerald-300">
              {JSON.stringify(readResult, null, 2)}
            </pre>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Path: <code>{TEST_PATH}</code>
          </p>
        </Section>

        {/* 5. Current user */}
        <Section title="Current User">
          {currentUser ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <UserIcon className="mt-0.5 h-5 w-5 text-emerald-600" />
              <div className="text-sm">
                <p className="font-semibold text-emerald-900">{currentUser.email}</p>
                <p className="text-xs text-emerald-700">UID: {currentUser.uid}</p>
                {userData && (
                  <p className="text-xs text-emerald-700">
                    Role: {String(userData.role)} • Name: {String(userData.name)}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Badge tone="muted" icon={<UserIcon className="h-4 w-4" />}>No user signed in</Badge>
          )}
        </Section>

        {/* 4. Auth */}
        <Section title="4. Authentication Test">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Password (min 6)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <ActionButton onClick={handleSignup} loading={busy === "signup"} icon={<UserPlus className="h-4 w-4" />}>
              Signup
            </ActionButton>
            <ActionButton onClick={handleLogin} loading={busy === "login"} icon={<LogIn className="h-4 w-4" />}>
              Login
            </ActionButton>
            {currentUser && (
              <ActionButton onClick={handleLogout} loading={busy === "logout"} icon={<LogOut className="h-4 w-4" />} variant="outline">
                Logout
              </ActionButton>
            )}
          </div>
          {authMsg && (
            <p className={`mt-3 text-sm ${authMsg.type === "ok" ? "text-emerald-600" : "text-red-600"}`}>
              {authMsg.text}
            </p>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#FFA500]/25 bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-[#FFA500]">{title}</h2>
      {children}
    </div>
  );
}

function Badge({
  tone,
  icon,
  children,
}: {
  tone: "ok" | "err" | "muted";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    ok: "bg-emerald-100 text-emerald-700 border-emerald-200",
    err: "bg-red-100 text-red-700 border-red-200",
    muted: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${tones[tone]}`}>
      {icon} {children}
    </span>
  );
}

function ActionButton({
  onClick,
  loading,
  icon,
  children,
  variant = "solid",
}: {
  onClick: () => void;
  loading?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "solid" | "outline";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 ${
        variant === "solid"
          ? "text-white shadow-md"
          : "border border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
      style={variant === "solid" ? { background: "linear-gradient(135deg, #FFA500, #FFD700)" } : undefined}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
