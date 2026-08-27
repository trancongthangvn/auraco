"use client";

import { useState } from "react";
import Image from "next/image";

export default function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4">
      {images.length > 1 && (
        <div className="flex sm:flex-col gap-3">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden border ${
                active === i ? "border-[#2b261f]" : "border-black/10"
              }`}
            >
              <Image src={src} alt={`${name} ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
      <div className="relative flex-1 aspect-square bg-[#f5f2ee] overflow-hidden">
        <Image
          src={images[active]}
          alt={name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}
