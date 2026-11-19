"use client";

import { useState } from "react";
import { login } from "./actions";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = await login(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="auth-canvas relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="auth-grid pointer-events-none absolute inset-0" />

      <div className="relative w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-5">
            <div className="absolute inset-0 -z-10 rounded-full bg-primary/40 blur-2xl" />
            <BrandMark size={60} />
          </div>
          <BrandWordmark className="text-3xl" />
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your workspace</p>
        </div>

        <div className="surface rounded-2xl p-7 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  name="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="field-input h-10 pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="field-input h-10 pl-9"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 ring-1 ring-inset ring-destructive/25 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary group w-full h-10 mt-2"
            >
              {loading ? "Signing in…" : "Sign In"}
              {!loading && <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          © {new Date().getFullYear()} HexNinja · Private workspace
        </p>
      </div>
    </div>
  );
}
