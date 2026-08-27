"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon } from "@/components/icons";

export default function Accordion({
  items,
}: {
  items: { title: string; content: string }[];
}) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="border-t border-black/10 mt-8">
      {items.map((item, i) => (
        <div key={item.title} className="border-b border-black/10">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between py-4 text-sm tracking-wide"
          >
            {item.title}
            {open === i ? <MinusIcon size={14} /> : <PlusIcon size={14} />}
          </button>
          {open === i && (
            <p className="pb-4 text-sm text-black/60 leading-relaxed whitespace-pre-line">
              {item.content}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
