import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy | AURA & CO" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: "Information We Collect",
          body: "We collect the information you provide when placing an order, creating an account, or signing up for our newsletter — including your name, email, shipping address, and payment details processed securely through our payment provider.",
        },
        {
          heading: "How We Use Your Information",
          body: "Your information is used to process orders, provide customer support, and — with your consent — send you updates about new arrivals and promotions. We never sell your personal data to third parties.",
        },
        {
          heading: "Cookies",
          body: "We use cookies to remember your cart, preferences, and to understand how visitors use our site so we can improve your experience.",
        },
        {
          heading: "Your Rights",
          body: "You may request access to, correction of, or deletion of your personal data at any time by contacting us through our Contact page.",
        },
      ]}
    />
  );
}
