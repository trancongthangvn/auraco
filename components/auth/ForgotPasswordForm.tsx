"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  if (sent) {
    return (
      <div className="mx-auto max-w-[468px] px-6 pb-16">
        <p className="text-[13px] font-light" role="status">
          If an account exists for {email}, we have sent a link to reset your password.
        </p>
        <p className="mt-6 text-[13px]">
          <Link href="/login" className="underline hover:text-black">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (sending) return;
        setSending(true);
        setError("");
        apiFetch("/api/account/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: email.trim() }),
        })
          .then(() => setSent(true))
          .catch((err: unknown) => {
            setError(err instanceof ApiError ? err.message : "Could not process your request. Please try again.");
          })
          .finally(() => setSending(false));
      }}
      className="mx-auto max-w-[468px] px-6 pb-16 space-y-6"
    >
      <label className="block text-sm">
        <span className="block mb-2">Email</span>
        <input
          required
          type="email"
          disabled={sending}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        disabled={sending}
        className="w-full rounded-none border border-black bg-black text-white py-[10.4px] text-[10px] font-semibold uppercase tracking-[0.35px] hover:bg-[#2b261f] hover:border-[#2b261f] transition-colors disabled:opacity-60"
      >
        {sending ? "Sending..." : "Send reset link"}
      </button>

      <p className="text-[13px]">
        <Link href="/login" className="underline hover:text-black">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
