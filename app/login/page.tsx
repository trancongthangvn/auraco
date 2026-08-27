import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign In | AURA & CO",
  description: "Sign in to view your orders, saved pieces, and account details.",
};

export default function LoginPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero
          title="Sign In"
          subtitle="Sign in to view your orders, saved pieces, and account details."
        />
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
