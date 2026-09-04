"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";

export default function LoginForm() {
  const dict = useDictionary().auth.login;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(dict.demoMessage);
      }}
      className="mx-auto max-w-[468px] px-6 pb-16 space-y-6"
    >
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-0 border-b border-[#d4d4d4] pb-2 text-[13px] font-light bg-transparent focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f]"
        />
      </label>

      {/* Stacked, not a left/right row — matches the reference site, which
          shows "Forgot your password?" as its own line above "Remember me",
          both left-aligned, not split across a justify-between row. */}
      <div className="space-y-4 text-sm">
        <button
          type="button"
          onClick={() => setMessage(dict.forgotDemoMessage)}
          className="text-black/60 underline hover:text-black"
        >
          {dict.forgotPassword}
        </button>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 border border-black/20 accent-ink"
          />
          {dict.rememberMe}
        </label>
      </div>

      {/* border-black here matches the invisible-but-present border on the
          Google button below (border border-[#2b261f]) — without it this
          button rendered ~2px shorter (no border box to add to the padding),
          a mismatch easy to miss reading the classes but visible side by
          side. */}
      <button
        type="submit"
        className="w-full rounded-none border border-black bg-black text-white py-[10.4px] text-[10px] font-semibold uppercase tracking-[0.35px] hover:bg-[#2b261f] hover:border-[#2b261f] transition-colors"
      >
        {dict.signIn}
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
        {dict.noAccount}{" "}
        <Link href="/register" className="underline hover:text-black">
          {dict.createOne}
        </Link>
      </p>

      <p className="text-xs text-black/40 text-center pt-4">{dict.demoNotice}</p>
    </form>
  );
}
