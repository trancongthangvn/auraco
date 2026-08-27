import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Return Policy | AURA & CO" };

export default function ReturnPolicyPage() {
  return (
    <LegalPage
      title="Return Policy"
      sections={[
        {
          heading: "30-Day Returns",
          body: "We accept returns within 30 days of delivery for unworn items in their original packaging with tags attached. Simply contact us to start a return.",
        },
        {
          heading: "Refunds",
          body: "Once we receive and inspect your returned item, refunds are issued to your original payment method within 5–7 business days.",
        },
        {
          heading: "Exchanges",
          body: "Need a different size or style? Contact our team and we'll help arrange an exchange as quickly as possible.",
        },
        {
          heading: "2-Year Warranty",
          body: "All pieces are covered by our 2-year warranty against manufacturing defects, including plating and stone-setting issues under normal wear.",
        },
      ]}
    />
  );
}
