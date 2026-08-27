import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = {
  title: "Create Account | AURA & CO",
  description:
    "Create an account to check out faster and keep track of your orders.",
};

export default function RegisterPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="Create Account"
          subtitle="Create an account to check out faster and keep track of your orders."
        />
        <RegisterForm />
      </main>
      <Footer />
    </>
  );
}
