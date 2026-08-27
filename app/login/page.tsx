"use client";

import { useState } from "react";
import Link from "next/link";
import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="Sign In"
          subtitle="Sign in to view your orders, saved pieces, and account details."
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(
              "This is a UI demo — no account system is connected yet."
            );
          }}
          className="mx-auto max-w-[560px] px-6 py-16 space-y-5"
        >
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="border border-black/20"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() =>
                setMessage("Password reset is not available in this demo.")
              }
              className="text-black/60 underline hover:text-black"
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-[#2b261f] text-white py-3 text-sm tracking-wide hover:bg-black transition-colors"
          >
            SIGN IN
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
            <span aria-hidden>G</span>
            Continue with Google
          </button>

          {message && (
            <p className="text-xs text-center text-black/70">{message}</p>
          )}

          <p className="text-sm text-center">
            No account yet?{" "}
            <Link href="/register" className="underline hover:text-black">
              Create one
            </Link>
          </p>

          <p className="text-xs text-black/40 text-center pt-4">
            Demo giao diện, chưa kết nối hệ thống tài khoản thật.
          </p>
        </form>
      </main>
      <Footer />
    </>
  );
}
