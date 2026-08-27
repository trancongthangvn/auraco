import Image from "next/image";
import Link from "next/link";

export type CollectionTile = {
  name: string;
  href: string;
  img: string;
};

export default function Collections({
  collections,
}: {
  collections: CollectionTile[];
}) {
  return (
    <section className="mx-auto max-w-[1400px] px-6 py-16">
      <h2 className="font-serif-display text-3xl text-center mb-10">
        Collections
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {collections.map((c) => (
          <Link
            key={c.name}
            href={c.href}
            className="group relative aspect-[3/4] overflow-hidden"
          >
            <Image
              src={c.img}
              alt={c.name}
              fill
              sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
            <span className="absolute inset-x-0 bottom-4 text-center text-white text-xs tracking-[0.15em]">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
