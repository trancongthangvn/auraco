import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Security Policy | AURA & CO" };

export default function SecurityPolicyPage() {
  return (
    <LegalPage
      title="Security policy"
      sections={[
        {
          heading: "1. Encryption",
          body: "Our site is secured with SSL encryption. Every piece of data transmitted between your browser and our servers — including personal details and login credentials — is encrypted in transit. Look for the lock icon and https:// in your browser's address bar to confirm.",
        },
        {
          heading: "2. Secure Payment Processing",
          body: "We don't store or have direct access to your full card details. All transactions are routed through PCI-DSS-compliant payment processors, keeping your financial data encrypted and out of our systems entirely.",
        },
        {
          heading: "3. Account Security",
          body: "Passwords are hashed and cannot be read by our team. We recommend using a strong, unique password for your account and never sharing your login details with anyone.",
        },
        {
          heading: "4. Restricted Data Access",
          body: "Access to your personal data is limited to team members who need it to do their job — such as order fulfillment or customer support — under strict confidentiality practices.",
        },
        {
          heading: "5. Reporting a Concern",
          body: "If you believe your account has been compromised, notice suspicious activity, or discover a security vulnerability, please contact us immediately through our Contact page so we can investigate.",
        },
      ]}
    />
  );
}
