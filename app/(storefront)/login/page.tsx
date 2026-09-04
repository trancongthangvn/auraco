import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import LoginForm from "@/components/auth/LoginForm";
import { getServerDictionary } from "@/lib/i18n/server";

export const metadata = {
  title: "Sign In | AURA & CO",
  description: "Sign in to view your orders, saved pieces, and account details.",
};

export default async function LoginPage() {
  const { dict } = await getServerDictionary();
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero title={dict.auth.login.title} subtitle={dict.auth.login.subtitle} />
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
