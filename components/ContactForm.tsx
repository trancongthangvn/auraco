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

  const field =
    "w-full rounded-[8px] border border-[rgba(43,38,31,0.15)] bg-[#faf6ec] px-4 py-3 text-sm text-[#2b261f] placeholder:text-black/35 focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:bg-black/[0.03]";
  const label = "block text-xs font-semibold tracking-wide uppercase mb-2 text-[#2b261f]";

  return (
    <div className="mx-auto max-w-[600px] px-6 pb-16">
      <div className="rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-8 shadow-[0_8px_28px_rgba(28,24,18,0.06)] sm:p-10">
        <h2 className="font-serif-display mb-2 text-center text-2xl font-normal text-[#2b261f]">
          {dict.heading}
        </h2>
        <p className="mb-8 text-center text-sm text-black/60">{dict.subheading}</p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label htmlFor="contact-name" className={label}>
              {dict.fullName}
            </label>
            <input
              id="contact-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={sending || sent}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="contact-phone" className={label}>
              {dict.phone}
            </label>
            <input
              id="contact-phone"
              type="tel"
              placeholder={dict.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sending || sent}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className={label}>
              {dict.email}
            </label>
            <input
              id="contact-email"
              required
              type="email"
              placeholder={dict.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending || sent}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="contact-address" className={label}>
              {dict.address}
            </label>
            <textarea
              id="contact-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={sending || sent}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="contact-product" className={label}>
              {dict.product}
            </label>
            <input
              id="contact-product"
              placeholder={dict.productPlaceholder}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              disabled={sending || sent}
              className={field}
            />
          </div>
          <div>
            <label htmlFor="contact-message" className={label}>
              {dict.message}
            </label>
            <textarea
              id="contact-message"
              rows={4}
              placeholder={dict.messagePlaceholder}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending || sent}
              className={field}
            />
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
