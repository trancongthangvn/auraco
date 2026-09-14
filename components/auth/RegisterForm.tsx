"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import { accountFetch, setCustomerToken, type Customer } from "@/lib/customerAuth";
import { GoogleIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";

export default function RegisterForm() {
  const dict = useDictionary().auth.register;
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage("");
        setSubmitError("");
        if (password !== confirmPassword) {
          setError(dict.passwordMismatch);
          return;
        }
        setError("");
        setSubmitting(true);
        try {
          const data = await accountFetch<{ token: string; customer: Customer }>(
            "/api/account/register",
            {
              method: "POST",
              body: JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password }),
            }
          );
          setCustomerToken(data.token);
          router.push("/account");
        } catch (err) {
          setSubmitError(
            err instanceof ApiError ? err.message : "Could not create your account. Please try again."
          );
          setSubmitting(false);
        }
      }}
      className="mx-auto max-w-[620px] px-6 pb-16 space-y-6"
    >
      <label className="block text-sm">
        <span className="block mb-2">{dict.fullName}</span>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f]"
        />
      </label>
      <label className="block text-sm">
        <span className="block mb-2">{dict.email}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f]"
        />
      </label>
      <label className="block text-sm">
        <span className="block mb-2">{dict.password}</span>
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f]"
        />
      </label>
      <label className="block text-sm">
        <span className="block mb-2">{dict.confirmPassword}</span>
        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          aria-describedby={error ? "confirm-password-error" : undefined}
          aria-invalid={!!error}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f]"
        />
        {error && (
          <p id="confirm-password-error" role="alert" className="text-xs text-red-700 mt-2">
            {error}
          </p>
        )}
      </label>

      {submitError && (
        <p role="alert" className="text-xs text-center text-red-700">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-none border border-black bg-black text-white py-[10.4px] text-[10px] font-semibold uppercase tracking-[0.35px] hover:bg-[#2b261f] hover:border-[#2b261f] transition-colors disabled:opacity-60"
      >
        {dict.createAccount}
      </button>

      <div className="flex items-center gap-4 text-xs text-black/40 uppercase tracking-wide">
        <div className="flex-1 h-px bg-black/10" />
        {dict.or}
        <div className="flex-1 h-px bg-black/10" />
      </div>

      <button
        type="button"
        onClick={() => setMessage(dict.googleDemoMessage)}
        className="w-full rounded-none border border-[#2b261f] px-6 py-[10.4px] text-[10px] font-semibold uppercase tracking-[0.35px] hover:bg-[#2b261f] hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <GoogleIcon size={18} />
        {dict.continueWithGoogle}
      </button>

      {message && (
        <p role="status" aria-live="polite" className="text-xs text-center text-black/70">
          {message}
        </p>
      )}

      <p className="text-sm text-center">
        {dict.haveAccount}{" "}
        <Link href="/login" className="underline hover:text-black">
          {dict.signIn}
        </Link>
      </p>

    </form>
  );
}
