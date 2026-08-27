import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";

export default function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero title={title} />
        <div className="mx-auto max-w-[800px] px-6 py-16 space-y-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-lg font-medium mb-2">{s.heading}</h2>
              <p className="text-sm text-black/70 leading-relaxed whitespace-pre-line">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
