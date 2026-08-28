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
    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
      {/* A product saved without images leaves images[active] undefined —
          show the tinted frame rather than a broken image. */}
      <div className="relative order-1 aspect-[5/6] bg-[#f5f2ee] overflow-hidden cursor-zoom-in">
        {images[active] && (
          <Image
            src={images[active]}
            alt={name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="order-2 flex flex-row sm:flex-col gap-2.5 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto sm:max-h-[702px]">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActive(i)}
              className={`relative aspect-[3/4] w-24 sm:w-full shrink-0 overflow-hidden rounded-lg ${
                active === i ? "outline outline-2 outline-[#2b261f]" : ""
              }`}
            >
              <Image src={src} alt={`${name} ${i + 1}`} fill className="object-cover" sizes="(min-width: 640px) 30vw, 96px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
