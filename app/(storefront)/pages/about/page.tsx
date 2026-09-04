import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";

export const metadata = { title: "About | AURA & CO" };

export default function AboutPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="About AURA & CO"
          subtitle="Your Anchor in a Fast-Paced World."
        />
        <div className="mx-auto max-w-[800px] px-6 py-16 space-y-6">
          <p className="text-sm text-black/70 leading-relaxed">
            AURA & CO was founded on a simple idea: jewelry you can wear every
            single day should never feel like an occasion piece. We design
            necklaces, bracelets, earrings, and sets that move with your life,
            from the morning commute to the dinner you didn&apos;t plan on staying
            out for, without asking you to take them off in between.
          </p>
          <p className="text-sm text-black/70 leading-relaxed">
            Every piece starts with materials built to hold up to real wear.
            We work in 18k gold vermeil and solid sterling silver, layering a
            thicker-than-standard plating over each base to resist tarnish and
            fading far longer than typical fashion jewelry. Where we set
            stones, they are genuine, never glass or resin, chosen for
            clarity and cut rather than size alone.
          </p>
          <p className="text-sm text-black/70 leading-relaxed">
            Craftsmanship shows up in the details you notice only after months
            of wear: a clasp that still closes smoothly, an edge that never
            catches on your clothing, a finish that still catches the light.
            Each piece is hand-finished and inspected before it leaves our
            studio, because the small things are what separate jewelry that
            lasts from jewelry that doesn&apos;t.
          </p>
          <p className="text-sm text-black/70 leading-relaxed">
            Above all, we design for real life. Our collections are built
            around versatility: pieces that pair easily with what&apos;s already
            in your jewelry box, layer well with themselves, and look just as
            at home with a t-shirt as they do with your favorite dress. That&apos;s
            the everyday-wearable philosophy behind everything we make.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
