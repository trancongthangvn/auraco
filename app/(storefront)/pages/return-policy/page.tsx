import LegalPage from "@/components/LegalPage";

export const metadata = { title: "Return Policy | AURA & CO" };

export default function ReturnPolicyPage() {
  return (
    <LegalPage
      title="Return Policy"
      sections={[
        {
          heading: "1. 30-Day Return Window",
          body: "We offer a 30-day return or exchange window from the date of delivery. To be eligible, your item must be unworn, in its original condition, and in its original packaging with tags attached.\nNon-returnable: personalized or engraved pieces, gift cards, and items marked \"Final Sale\" at the time of purchase.",
        },
        {
          heading: "2. Defective or Incorrect Items",
          body: "If we made a mistake — the wrong item was sent, or your piece arrived damaged — we'll cover the cost of return shipping and make it right.",
        },
        {
          heading: "3. Return Shipping",
          body: "For a change-of-mind return, you're responsible for the cost of return shipping. We recommend using a trackable shipping method — we can't guarantee we'll receive a package sent without tracking.",
        },
        {
          heading: "4. Refunds",
          body: "Once your return is received and inspected, we'll notify you by email. Approved refunds are issued to your original payment method within 5–7 business days.",
        },
        {
          heading: "5. Exchanges",
          body: "Need a different size or style? Contact our team through the Contact page and we'll help arrange an exchange as quickly as possible.",
        },
        {
          heading: "6. 2-Year Warranty",
          body: "All pieces are covered by our 2-year warranty against manufacturing defects, including plating and stone-setting issues under normal wear.",
        },
        {
          heading: "How to Start a Return",
          body: "Contact us through our Contact page with your order number. We'll provide return instructions and the correct return address — please don't ship items back to the address on the original package.",
        },
      ]}
    />
  );
}
