import Image from "next/image";

export default function ITGirlEdit() {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16 grid gap-8 lg:grid-cols-2 items-center">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src="/images/pages/64e5ed6e-0491-4f3d-a678-b315945972da.png"
          alt="The IT-Girl Edit"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div>
        <h2 className="font-serif-display text-3xl mb-4">
          The IT-Girl Edit: Effortless Edge & Sterling Chic
        </h2>
        <p className="text-black/70 leading-relaxed">
          Redefine your everyday sparkle with pieces curated for the modern
          trendsetter. Blending effortless streetwear cool with high-shine
          sterling silver sophistication, this collection is designed for the
          girl who sets the standard instead of following it. From coffee runs to VIP
          nights out, make every look unforgettable.
        </p>
      </div>
    </section>
  );
}
