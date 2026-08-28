import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms of Service | AURA & CO" };

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        {
          heading: "1. Use of Site",
          body: "By accessing this site, you agree to use it only for lawful purposes and in a way that doesn't infringe the rights of, or restrict, anyone else's use of it.",
        },
        {
          heading: "2. Accounts",
          body: "You're responsible for maintaining the confidentiality of your account credentials and for all activity under your account. Let us know right away if you suspect unauthorized use.",
        },
        {
          heading: "3. Orders & Pricing",
          body: "All prices are listed in USD and are subject to change without notice. We reserve the right to refuse, limit, or cancel any order at our discretion, including in cases of suspected fraud or pricing errors.",
        },
        {
          heading: "4. Returns & Refunds",
          body: "Purchases are covered by our Return Policy, which forms part of these Terms.",
        },
        {
          heading: "5. Intellectual Property",
          body: "All content on this site, including images, text, and designs, is the property of AURA & CO and may not be reproduced without permission.",
        },
        {
          heading: "6. Limitation of Liability",
          body: "AURA & CO is not liable for any indirect or consequential loss arising from the use of this site or our products, to the fullest extent permitted by law.",
        },
        {
          heading: "7. Changes to These Terms",
          body: "We may update these Terms from time to time. Continued use of the site after changes are posted constitutes acceptance of the revised Terms.",
        },
      ]}
    />
  );
}
