"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { apiFetch, ApiError } from "@/lib/api";

/**
 * Posts to POST /api/inquiries, which is what fills the admin "Yêu cầu liên hệ"
 * inbox. The API requires a non-empty `subject`; the form's optional Product
 * field doubles as that, falling back to a generic subject when left blank.
 * There's no dedicated `address` column, so it's folded into the message
 * body instead of adding a migration for one extra line of text.
 */
export default function ContactForm() {
  const dict = useDictionary().contact;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [product, setProduct] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || sent) return;
    setSending(true);
    setError(null);
    const body = [`Address: ${address.trim() || "—"}`, message.trim()]
      .filter(Boolean)
      .join("\n\n");
    apiFetch("/api/inquiries", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject: product.trim() || dict.defaultSubject,
        message: body,
      }),
    })
      .then(() => {
        setSent(true);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : dict.error);
      })
      .finally(() => {
        setSending(false);
      });
  };

  // Same floating-label treatment as the checkout's FloatingField (see
  // components/checkout/CheckoutClient.tsx): white field, hairline border, and
  // the label sitting inside the box until the field is focused or filled.
  //
  // `placeholder=" "` on every control below is load-bearing, not a leftover:
  // `:placeholder-shown` is what tells the label whether the field is still
  // empty. A real placeholder would keep that selector permanently false and
  // strand the label in its floated position.
  const fieldInput =
    "peer w-full rounded-[6px] border border-[#d5d5d5] bg-white px-4 pb-2 pt-5 font-ui text-[13px] text-[#171717] outline-none transition-colors focus:border-[#2b261f] disabled:bg-black/[0.03]";
  const fieldLabel =
    "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-ui text-[12px] font-light text-[#6d6d6d] transition-all peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:translate-y-0 peer-[&:not(:placeholder-shown)]:text-[10px]";
  // A textarea is too tall to centre its label vertically, so that one starts
  // near the top edge and only shrinks in place.
  const areaInput =
    "peer w-full rounded-[6px] border border-[#d5d5d5] bg-white px-4 pb-2 pt-6 font-ui text-[13px] text-[#171717] outline-none transition-colors focus:border-[#2b261f] disabled:bg-black/[0.03]";
  const areaLabel =
    "pointer-events-none absolute left-4 top-4 font-ui text-[12px] font-light text-[#6d6d6d] transition-all peer-focus:top-2 peer-focus:text-[10px] peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-[10px]";

  return (
    <div className="mx-auto max-w-[600px] px-6 pb-16">
      <div className="rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-8 shadow-[0_8px_28px_rgba(28,24,18,0.06)] sm:p-10">
        <h2 className="font-serif-display mb-2 text-center text-2xl font-normal text-[#2b261f]">
          {dict.heading}
        </h2>
        <p className="mb-8 text-center text-sm text-black/60">{dict.subheading}</p>

        <form onSubmit={submit} className="space-y-5">
          <div className="relative">
            <input
              id="contact-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={sending || sent}
              placeholder=" "
              className={fieldInput}
            />
            <label htmlFor="contact-name" className={fieldLabel}>
              {dict.fullName}
            </label>
          </div>
          <div className="relative">
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sending || sent}
              placeholder=" "
              className={fieldInput}
            />
            <label htmlFor="contact-phone" className={fieldLabel}>
              {dict.phone}
            </label>
          </div>
          <div className="relative">
            <input
              id="contact-email"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending || sent}
              placeholder=" "
              className={fieldInput}
            />
            <label htmlFor="contact-email" className={fieldLabel}>
              {dict.email}
            </label>
          </div>
          <div className="relative">
            <textarea
              id="contact-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={sending || sent}
              placeholder=" "
              className={areaInput}
            />
            <label htmlFor="contact-address" className={areaLabel}>
              {dict.address}
            </label>
          </div>
          <div className="relative">
            <input
              id="contact-product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={sending || sent}
              placeholder=" "
              className={fieldInput}
            />
            <label htmlFor="contact-product" className={fieldLabel}>
              {dict.product}
            </label>
          </div>
          <div className="relative">
            <textarea
              id="contact-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending || sent}
              placeholder=" "
              className={areaInput}
            />
            <label htmlFor="contact-message" className={areaLabel}>
              {dict.message}
            </label>
          </div>

          {error && (
            <p role="alert" className="border border-red-700/30 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending || sent}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#2b261f] py-3.5 text-xs font-semibold tracking-[0.12em] text-[#2b261f] transition-colors hover:bg-[#2b261f] hover:text-white disabled:opacity-60"
          >
            {sent ? (
              <>
                {dict.sent} <CheckIcon size={15} />
              </>
            ) : sending ? (
              dict.sending
            ) : (
              dict.send
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
