"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";

const MIN_PASSWORD = 8;

// `token` comes from the dynamic route segment (see
// app/(storefront)/reset-password/[token]/page.tsx). The email is read from
// the query string via window.location, not useSearchParams — same standing
// rule as ThankYouClient.tsx (DEPLOYMENT.md): that hook forces a Suspense
// boundary that has shipped blank pages before.
export default function ResetPasswordForm({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const fromLink = search.get("email");
    if (fromLink) queueMicrotask(() => setEmail(fromLink));
  }, []);

  if (done) {
    return (
      <div className="mx-auto max-w-[468px] px-6 pb-16">
        <p className="text-[13px] font-light" role="status">
          Your password has been reset.
        </p>
        <p className="mt-6 text-[13px]">
          <Link href="/login" className="underline hover:text-black">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (submitting) return;
        setError("");
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        if (password.length < MIN_PASSWORD) {
          setError(`Password must be at least ${MIN_PASSWORD} characters.`);
          return;
        }
        setSubmitting(true);
        apiFetch("/api/account/reset-password", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), token, new_password: password }),
        })
          .then(() => {
            setDone(true);
            setTimeout(() => router.push("/login"), 3000);
          })
          .catch((err: unknown) => {
            setError(err instanceof ApiError ? err.message : "Could not reset your password. Please try again.");
          })
          .finally(() => setSubmitting(false));
      }}
      className="mx-auto max-w-[468px] px-6 pb-16 space-y-6"
    >
      <label className="block text-sm">
        <span className="block mb-2">Email</span>
        <input
          required
          type="email"
          disabled={submitting}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:opacity-60"
        />
      </label>

      <label className="block text-sm">
        <span className="block mb-2">New password</span>
        <input
          required
          type="password"
          disabled={submitting}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:opacity-60"
        />
      </label>

      <label className="block text-sm">
        <span className="block mb-2">Confirm password</span>
        <input
          required
          type="password"
          disabled={submitting}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:opacity-60"
        />
      </label>

      {error && (
        <p role="alert" className="text-xs text-center text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-none border border-black bg-black text-white py-[10.4px] text-[10px] font-semibold uppercase tracking-[0.35px] hover:bg-[#2b261f] hover:border-[#2b261f] transition-colors disabled:opacity-60"
      >
        {submitting ? "Resetting..." : "Reset password"}
      </button>

      <p className="text-[13px]">
        <Link href="/login" className="underline hover:text-black">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
