import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact | AURA & CO",
  description:
    "Questions about sizing, materials, or your order? Reach our US-facing support team.",
};

export default function ContactPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="Contact"
          subtitle="Questions about sizing, materials, or your order? Reach our US-facing support team."
        />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
