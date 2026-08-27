import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Terms of Service | AURA & CO" };

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        {
          heading: "Use of Site",
          body: "By accessing this site, you agree to use it only for lawful purposes and in a way that doesn't infringe the rights of, or restrict, anyone else's use of it.",
        },
        {
          heading: "Orders & Pricing",
          body: "All prices are listed in USD and are subject to change without notice. We reserve the right to refuse or cancel any order at our discretion.",
        },
        {
          heading: "Intellectual Property",
          body: "All content on this site, including images, text, and designs, is the property of AURA & CO and may not be reproduced without permission.",
        },
        {
          heading: "Limitation of Liability",
          body: "AURA & CO is not liable for any indirect or consequential loss arising from the use of this site or our products.",
        },
      ]}
    />
  );
}
