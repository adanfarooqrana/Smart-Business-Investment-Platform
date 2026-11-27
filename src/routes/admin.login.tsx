import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Mail, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  authenticateAdmin,
  isAdminSessionValid,
} from "@/services/adminKycService";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void isAdminSessionValid().then((valid) => { if (valid) navigate({ to: "/admin/dashboard" }); });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (await authenticateAdmin(email, password)) {
        navigate({ to: "/admin/dashboard" });
        return;
      }
    } catch { /* Use the same error for inaccessible admin accounts. */ }
    setError("Invalid admin credentials.");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-amber-400/30 bg-slate-900/80 p-8 shadow-[0_0_50px_rgba(251,191,36,0.15)] backdrop-blur-xl"
      >
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to site
        </Link>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">Admin Login</h1>
          <p className="mt-1 text-sm text-slate-400">KYC Control Panel · Authorized access only</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-slate-300">
              <Mail className="h-3.5 w-3.5" /> Email
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-600 bg-slate-800 text-white"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-slate-300">
              <Lock className="h-3.5 w-3.5" /> Password
            </Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="border-slate-600 bg-slate-800 text-white"
              required
            />
          </div>
          {error && <p className="text-sm font-semibold text-red-400">{error}</p>}
          <Button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 font-bold text-slate-900"
          >
            Sign in to Admin Dashboard
          </Button>
        </div>
      </form>
    </div>
  );
}
