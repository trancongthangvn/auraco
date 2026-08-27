"use client";

import { useState } from "react";
import Link from "next/link";
import { GoogleIcon } from "@/components/icons";

export default function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setMessage("");
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        setError("");
        setMessage("This is a UI demo. No account system is connected yet.");
      }}
      className="mx-auto max-w-[560px] px-6 py-16 space-y-5"
    >
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Full name
        </label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Email
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Password
        </label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Confirm password
        </label>
        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
        {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full bg-[#2b261f] text-white py-3 text-sm tracking-wide hover:bg-black transition-colors"
      >
        CREATE ACCOUNT
      </button>

      <div className="flex items-center gap-4 text-xs text-black/40 uppercase tracking-wide">
        <div className="flex-1 h-px bg-black/10" />
        OR
        <div className="flex-1 h-px bg-black/10" />
      </div>

      <button
        type="button"
        onClick={() =>
          setMessage("Google sign-in is not available in this demo.")
        }
        className="w-full border border-[#2b261f] px-6 py-3 text-sm tracking-wide hover:bg-[#2b261f] hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <GoogleIcon size={18} />
        Continue with Google
      </button>

      {message && (
        <p className="text-xs text-center text-black/70">{message}</p>
      )}

      <p className="text-sm text-center">
        Already have an account?{" "}
        <Link href="/login" className="underline hover:text-black">
          Sign in
        </Link>
      </p>

      <p className="text-xs text-black/40 text-center pt-4">
        Demo giao diện, chưa kết nối hệ thống tài khoản thật.
      </p>
    </form>
  );
}
