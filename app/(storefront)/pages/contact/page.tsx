import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact Us | AURA & CO",
  description:
    "We'd love to hear from you. Reach out with any questions about your order or our pieces.",
};

export default function ContactPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="Contact Us"
          subtitle="We'd love to hear from you. Reach out with any questions about your order or our pieces."
        />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
