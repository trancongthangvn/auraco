"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const STORAGE_KEY = "aura-welcome-popup-dismissed";
const ARTWORK = "/images/settings/welcome-popup/98418fc0-5417-4aa4-a7b5-322bc1a2a793.webp";

/**
 * Welcome offer dialog, matching the reference site's `.welcome-popup`:
 * a 900×440 card, artwork on the left, sign-up form on the right. Below 750px
 * it stacks — a 210px artwork band above the form — which is where the
 * reference's own breakpoint sits, not at a Tailwind default.
 *
 * Shown once per visitor — the dismissal is remembered in localStorage, which
 * is read inside an effect (never during render) so the server and the first
 * client paint agree. Access is wrapped because private windows and blocked
 * site data make the accessor itself throw.
 */
export default function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Storage unavailable — treat as a first visit rather than failing.
    }
    if (dismissed) return;
    const id = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(id);
  }, []);

  // The Announcement bar's own "Sign up for 10% off" button is a deliberate
  // re-open, so it bypasses the dismissed-once gate above — matching the
  // reference, where that bar reopens the same dialog on demand.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-welcome-popup", onOpen);
    return () => window.removeEventListener("open-welcome-popup", onOpen);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Nothing to do: the popup simply reappears on the next visit.
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign up for 10% off"
      className="fixed inset-0 z-[200] grid place-items-center p-5 min-[1025px]:p-10"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className="absolute inset-0 bg-[rgba(18,16,14,0.52)] backdrop-blur-[4px]"
      />

      <div className="relative z-10 w-[calc(100%-30px)] max-w-[440px] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)] min-[750px]:w-[calc(100%-40px)] min-[750px]:max-w-[900px]">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 flex h-[30px] w-[30px] items-center justify-center text-[25px] leading-none font-light text-white min-[750px]:top-5 min-[750px]:right-5 min-[750px]:text-[#111]"
        >
          &times;
        </button>

        <div className="grid grid-rows-[210px_auto] min-[750px]:min-h-[440px] min-[750px]:grid-cols-2 min-[750px]:grid-rows-none">
          <div className="relative">
            <Image
              src={ARTWORK}
              alt=""
              fill
              sizes="(min-width: 750px) 450px, 100vw"
              className="object-cover object-[center_35%] min-[750px]:object-center"
            />
          </div>

          <div className="flex flex-col justify-center bg-white px-6 pt-8 pb-7 min-[750px]:px-14 min-[750px]:pt-[54px] min-[750px]:pb-[46px]">
            <h2 className="font-ui mb-5 max-w-[460px] text-[21px] leading-[1.1] font-semibold tracking-[-0.01em] text-[#050505] uppercase min-[750px]:text-[25px]">
              Sign up for 10% off
            </h2>

            {sent ? (
              <p className="font-ui text-[13px] font-light text-[#111]" role="status">
                Thank you — check your inbox for your welcome offer.
              </p>
            ) : (
              <form
                className="w-full max-w-[360px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
              >
                <label htmlFor="welcome-email" className="sr-only">
                  Email
                </label>
                <input
                  id="welcome-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="font-ui mb-6 h-12 w-full border border-[#111] px-4 text-[13px] font-normal tracking-[0.01em] text-[#111] outline-none placeholder:text-[#777] focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-black"
                />
                <button
                  type="submit"
                  className="font-ui flex h-[47px] w-full items-center justify-center bg-black px-5 text-[13px] font-medium tracking-[0.01em] text-white transition-opacity hover:opacity-85"
                >
                  Reveal My Offer
                </button>
              </form>
            )}

            <p className="font-ui mt-4 max-w-[410px] text-[11px] leading-[17.05px] font-light tracking-[0.01em] text-[rgba(55,50,45,0.52)]">
              Sharing your email signs you up for our marketing messages, and you
              may opt out whenever you like. Full details are in our{" "}
              <Link
                href="/pages/terms-of-service"
                className="text-[#111] underline underline-offset-2"
              >
                Terms Of Service
              </Link>{" "}
              &middot;{" "}
              <Link
                href="/pages/privacy-policy"
                className="text-[#111] underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
