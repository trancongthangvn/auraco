"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";

export default function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className="mx-auto max-w-[560px] px-6 py-16 space-y-5"
    >
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Full name
        </label>
        <input
          required
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
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Phone number (optional)
        </label>
        <input
          type="tel"
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Product (optional)
        </label>
        <input className="w-full border border-black/20 px-4 py-3 text-sm" />
      </div>
      <div>
        <label className="block text-xs tracking-wide uppercase mb-2">
          Message
        </label>
        <textarea
          required
          rows={5}
          className="w-full border border-black/20 px-4 py-3 text-sm"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-[#2b261f] text-white py-3 text-sm tracking-wide hover:bg-black transition-colors inline-flex items-center justify-center gap-2"
      >
        {sent ? (
          <>
            MESSAGE SENT <CheckIcon size={15} />
          </>
        ) : (
          "SEND MESSAGE"
        )}
      </button>
    </form>
  );
}
