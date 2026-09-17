import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Forgot Password | AETHER",
  description: "Reset the password for your AETHER account.",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <div className="mx-auto max-w-[468px] px-6 pt-12 pb-8">
          <h1 className="text-[22px] font-normal uppercase tracking-[0.12em] text-[#2b261f]">
            Forgot password
          </h1>
          <p className="mt-3 text-[13px] font-light text-[#6e6963]">
            Enter your email and we will send you a link to reset your password.
          </p>
          <div className="mt-4 h-px w-10 bg-black/25" />
        </div>
        <ForgotPasswordForm />
      </main>
      <Footer />
    </>
  );
}
