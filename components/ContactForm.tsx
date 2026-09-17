"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { apiFetch, ApiError } from "@/lib/api";

/**
 * White field with a hairline border and the label inside the box, lifting to a
 * small caption once the field is focused or filled.
 *
 * The lift is driven from React state, not Tailwind's `peer` +
 * `:placeholder-shown` variants. Those were tried first, to match the
 * checkout's FloatingField: the classes were emitted, the selector matched the
 * element, `:placeholder-shown` flipped correctly — and the label still never
 * moved. State is used here instead because it can actually be verified.
 */
function FloatField({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  rows,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  const multiline = typeof rows === "number";
  const up = focused || value.length > 0;

  const box =
    "w-full rounded-[6px] border border-[#d5d5d5] bg-white px-4 pb-2 font-ui text-[13px] text-[#171717] outline-none transition-colors focus:border-[#2b261f] disabled:bg-black/[0.03] " +
    (multiline ? "pt-6" : "pt-5");
  const caption =
    "pointer-events-none absolute left-4 font-ui font-light text-[#6d6d6d] transition-all " +
    (up
      ? "top-[6px] text-[10px]"
      : multiline
        ? "top-[18px] text-[12px]"
        : "top-1/2 -translate-y-1/2 text-[12px]");

  const shared = {
    id,
    value,
    required,
    disabled,
    className: box,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} type={type} />
      )}
      <label htmlFor={id} className={caption}>
        {label}
      </label>
    </div>
  );
}

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
    const body = [`Address: ${address.trim() || "-"}`, message.trim()]
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

  return (
    <div className="mx-auto max-w-[600px] px-6 pb-16">
      <div className="rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-8 shadow-[0_8px_28px_rgba(28,24,18,0.06)] sm:p-10">
        <h2 className="font-serif-display mb-2 text-center text-2xl font-normal text-[#2b261f]">
          {dict.heading}
        </h2>
        <p className="mb-8 text-center text-sm text-black/60">{dict.subheading}</p>

        <form onSubmit={submit} className="space-y-5">
          <FloatField
            id="contact-name"
            label={dict.fullName}
            value={name}
            onChange={setName}
            required
            disabled={sending || sent}
          />
          <FloatField
            id="contact-phone"
            label={dict.phone}
            type="tel"
            value={phone}
            onChange={setPhone}
            disabled={sending || sent}
          />
          <FloatField
            id="contact-email"
            label={dict.email}
            type="email"
            value={email}
            onChange={setEmail}
            required
            disabled={sending || sent}
          />
          <FloatField
            id="contact-address"
            label={dict.address}
            value={address}
            onChange={setAddress}
            rows={3}
            disabled={sending || sent}
          />
          <FloatField
            id="contact-product"
            label={dict.product}
            value={product}
            onChange={setProduct}
            disabled={sending || sent}
          />
          <FloatField
            id="contact-message"
            label={dict.message}
            value={message}
            onChange={setMessage}
            rows={4}
            disabled={sending || sent}
          />

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
