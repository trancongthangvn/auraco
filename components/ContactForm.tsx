"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { apiFetch, ApiError } from "@/lib/api";

/**
 * Posts to POST /api/inquiries, which is what fills the admin "Yêu cầu liên hệ"
 * inbox. The API requires a non-empty `subject`; the form's optional Product
 * field doubles as that, falling back to a generic subject when left blank.
 */
export default function ContactForm() {
  const dict = useDictionary().contact;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    apiFetch("/api/inquiries", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        subject: product.trim() || dict.defaultSubject,
        message: message.trim(),
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
    "w-full border border-black/20 px-4 py-3 text-sm focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:bg-black/[0.03]";
  const label = "block text-xs tracking-wide uppercase mb-2";

  return (
    <form onSubmit={submit} className="mx-auto max-w-[560px] px-6 py-16 space-y-5">
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
        <label htmlFor="contact-email" className={label}>
          {dict.email}
        </label>
        <input
          id="contact-email"
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          required
          rows={5}
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
        className="w-full bg-[#2b261f] text-white py-3 text-sm tracking-wide hover:bg-black transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60"
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
  );
}
