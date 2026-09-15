import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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
        {/* Its own heading rather than the shared PageHero: this page wants
            the compact uppercase title with a short rule under it, aligned
            to the form's own column (max-w-[468px], same as LoginForm) —
            PageHero is a wider serif hero used as-is by every other page. */}
        <div className="mx-auto max-w-[468px] px-6 pt-12 pb-8">
          <h1 className="text-[22px] font-normal uppercase tracking-[0.12em] text-[#2b261f]">
            {dict.auth.login.title}
          </h1>
          <div className="mt-4 h-px w-10 bg-black/25" />
        </div>
        <LoginForm />
      </main>
      <Footer />
    </>
  );
}
