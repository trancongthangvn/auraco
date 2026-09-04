import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import RegisterForm from "@/components/auth/RegisterForm";
import { getServerDictionary } from "@/lib/i18n/server";

export const metadata = {
  title: "Create Account | AURA & CO",
  description:
    "Create an account to check out faster and keep track of your orders.",
};

export default async function RegisterPage() {
  const { dict } = await getServerDictionary();
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <PageHero title={dict.auth.register.title} subtitle={dict.auth.register.subtitle} />
        <RegisterForm />
      </main>
      <Footer />
    </>
  );
}
