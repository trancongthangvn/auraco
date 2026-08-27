import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Security Policy | AURA & CO" };

export default function SecurityPolicyPage() {
  return (
    <LegalPage
      title="Security Policy"
      sections={[
        {
          heading: "Secure Checkout",
          body: "All payment transactions are encrypted using industry-standard SSL technology and processed through PCI-compliant payment providers. We never store your full card details on our servers.",
        },
        {
          heading: "Account Security",
          body: "We recommend using a strong, unique password for your account and never sharing your login details with anyone.",
        },
        {
          heading: "Reporting a Concern",
          body: "If you believe your account has been compromised, or you've noticed suspicious activity, please contact us immediately through our Contact page.",
        },
      ]}
    />
  );
}
