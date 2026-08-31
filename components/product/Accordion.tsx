"use client";

import { useState } from "react";
import {
  MinusIcon,
  PlusIcon,
  ReturnBoxIcon,
  TruckIcon,
  WarrantyBadgeIcon,
  GemIcon,
  GiftIcon,
} from "@/components/icons";

// The reference's Delivery & Returns panel is a fixed five-line policy list —
// shipping, a store-wide materials guarantee, the waterproof guarantee,
// the return window, then gift-wrap — each with its own 28px outlined
// pictogram, in that order on every product page (confirmed identical across
// products). `bulletItems` carries those five lines already split, in order,
// rather than a blob split by sentence.
const POLICY_ICONS = [TruckIcon, GemIcon, WarrantyBadgeIcon, ReturnBoxIcon, GiftIcon];

export default function Accordion({
  items,
}: {
  items: {
    title: string;
    /** Unused when `bulletItems` is set (a fixed policy list needs no prose). */
    content?: string;
    /** Fixed policy lines (Delivery & Returns), rendered one per row with a
     *  cycling pictogram — takes precedence over `content` when set. */
    bulletItems?: string[];
    /** When set, `content` is trusted, server-authored HTML (never raw user
     * input) rendered via dangerouslySetInnerHTML instead of the plain-text
     * whitespace-pre-line path — used for the real per-product Details copy
     * imported from the reference site (see docs/product-details.sql). */
    html?: boolean;
  }[];
}) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mt-5 border-t border-[#2b261f]/12">
      {items.map((item, i) => (
        <div key={item.title} className="border-b border-[#2b261f]/12">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between py-[15.2px] font-ui text-[14.72px] font-semibold leading-[22.816px] tracking-[0.368px] text-[#302c27]"
          >
            {item.title}
            {open === i ? <MinusIcon size={14} /> : <PlusIcon size={14} />}
          </button>
          {open === i && (
            <>
              {item.bulletItems ? (
                <ul className="pb-4">
                  {item.bulletItems.map((sentence, s) => {
                    const Icon = POLICY_ICONS[s % POLICY_ICONS.length];
                    return (
                      <li
                        key={sentence}
                        className="flex items-center gap-[13.6px] border-b border-[#2b261f]/10 py-[14.4px] font-ui text-[14.72px] font-medium leading-[20.608px] tracking-[0.14px] text-[#2b261f] last:border-b-0"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                          <Icon size={28} />
                        </span>
                        {sentence}
                      </li>
                    );
                  })}
                </ul>
              ) : item.html ? (
                <div
                  className="pb-4 font-ui text-[14px] font-medium leading-[21.7px] tracking-[0.14px] text-[#302c27] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: item.content ?? "" }}
                />
              ) : (
                <p className="whitespace-pre-line pb-4 font-ui text-[14px] font-medium leading-[21.7px] tracking-[0.14px] text-[#302c27]">
                  {item.content}
                </p>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
