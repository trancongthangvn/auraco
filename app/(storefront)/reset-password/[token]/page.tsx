import Announcement from "@/components/Announcement";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Reset Password | AETHER",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <Announcement />
      <Header />
      <main>
        <div className="mx-auto max-w-[468px] px-6 pt-12 pb-8">
          <h1 className="text-[22px] font-normal uppercase tracking-[0.12em] text-[#2b261f]">
            Reset password
          </h1>
          <p className="mt-3 text-[13px] font-light text-[#6e6963]">
            Choose a new password for your account.
          </p>
          <div className="mt-4 h-px w-10 bg-black/25" />
        </div>
        <ResetPasswordForm token={token} />
      </main>
      <Footer />
    </>
  );
}
