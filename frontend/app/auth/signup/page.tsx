"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

const ROLES = [
  { value: "retail_investor", label: "Retail Investor" },
  { value: "analyst", label: "Financial Analyst" },
  { value: "auditor", label: "Auditor" },
];

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("retail_investor");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signup(name, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-fg-text mb-2">Create your account</h1>
        <p className="text-fg-muted text-sm">Start analyzing annual reports in minutes</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-fg-text mb-1.5 block">Full Name</label>
          <input className="fg-input" type="text" placeholder="Jane Doe" value={name}
            onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium text-fg-text mb-1.5 block">Email</label>
          <input className="fg-input" type="email" placeholder="analyst@firm.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium text-fg-text mb-1.5 block">Password</label>
          <input className="fg-input" type="password" placeholder="Min. 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <div>
          <label className="text-sm font-medium text-fg-text mb-1.5 block">Role</label>
          <select className="fg-input" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button id="signup-submit" type="submit" disabled={loading}
          className="btn-primary flex items-center justify-center gap-2 mt-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-fg-muted mt-6">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
      </p>
    </div>
  );
}
