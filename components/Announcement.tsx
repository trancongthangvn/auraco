"use client";

import { useState } from "react";
import { CloseIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";

export default function Announcement() {
  const dict = useDictionary();
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="relative bg-[#2b261f] text-white text-center text-sm py-2 px-8">
      <span>{dict.announcement.signup}</span>
      <button
        aria-label="Dismiss announcement"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
