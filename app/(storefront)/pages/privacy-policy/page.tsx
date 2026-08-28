import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Privacy Policy | AURA & CO" };

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: "1. Information We Collect",
          body: "Information you provide: when you create an account, contact us, or place an order, we collect details such as your name, billing and shipping address, email address, and phone number. Payment details are handled by our payment processor and are never stored on our servers.\nDevice and usage data: when you browse our site, we automatically collect data such as your IP address, browser type, and general browsing behavior to help us improve the shopping experience.",
        },
        {
          heading: "2. How We Use Your Information",
          body: "Fulfilling orders: to process transactions, arrange shipping, and respond to customer service inquiries.\nCommunication: to send order confirmations, shipping updates, and, with your consent, updates about new arrivals and offers. You can opt out of marketing emails at any time.\nSecurity: to verify account activity and help protect our store against fraudulent transactions.",
        },
        {
          heading: "3. Cookies and Tracking",
          body: "We use cookies to remember your cart and preferences, keep you signed in, and understand how visitors use our site. You can manage or disable cookies through your browser settings at any time.",
        },
        {
          heading: "4. How We Share Your Information",
          body: "We do not sell your personal data. We only share it with trusted service providers — such as shipping carriers and payment processors — solely to fulfill your order, or when required by law.",
        },
        {
          heading: "5. Your Rights",
          body: "Depending on your location, you may have the right to access, correct, or request deletion of your personal data, and to opt out of marketing communications. To exercise these rights, contact us through our Contact page and we'll respond within 30 days.",
        },
        {
          heading: "6. Data Security",
          body: "We use industry-standard safeguards, including SSL encryption, to protect your data from unauthorized access, loss, or misuse. We retain personal data only as long as necessary to fulfill the purposes described in this policy or as required by law.",
        },
        {
          heading: "7. Changes to This Policy",
          body: "We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. Continued use of our site after an update constitutes acceptance of the revised policy.",
        },
      ]}
    />
  );
}
