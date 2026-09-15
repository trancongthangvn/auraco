"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  accountFetch,
  clearCustomerToken,
  getCustomerToken,
  type Customer,
} from "@/lib/customerAuth";
import { useDictionary } from "@/components/i18n/LanguageProvider";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { formatPrice } from "@/lib/currency";

type AccountOrderItem = {
  id: number;
  name: string;
  material: string | null;
  price: string | number;
  qty: number;
  image_url: string | null;
  product_slug: string | null;
};

type AccountOrder = {
  id: number;
  order_code: string;
  status: string;
  payment_method: string;
  subtotal: string | number;
  discount_amount: string | number;
  shipping_fee: string | number;
  tax_amount: string | number | null;
  total: string | number;
  address: string;
  city: string;
  postal_code: string | null;
  country: string;
  created_at: string;
  items: AccountOrderItem[];
};

type Tab = "profile" | "edit" | "orders";

// Orders are stored and charged in USD; what's shown follows the currency
// the shopper picked in the header, like every other price on the site.
// This page used to hard-code a "$" and ignore that entirely, so switching
// currency changed every page except this one.
function useMoney() {
  const { currency, rates } = useCurrency();
  return (v: string | number | null | undefined) =>
    formatPrice(Number(v ?? 0), currency, rates[currency]);
}

const PAYMENT_LABEL: Record<string, string> = {
  card: "Credit card",
  paypal: "PayPal",
  cashapp: "Cash App",
  zelle: "Zelle",
  airwallex: "Card (Airwallex)",
};

const card =
  "rounded-[14px] border-[0.667px] border-[rgba(201,166,107,0.35)] bg-white p-6 shadow-[0_8px_28px_rgba(28,24,18,0.06)] sm:p-8";
const field =
  "w-full rounded-[8px] border border-[rgba(43,38,31,0.15)] bg-[#faf6ec] px-4 py-3 text-sm text-[#2b261f] placeholder:text-black/35 focus:border-[#2b261f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2b261f] disabled:bg-black/[0.04] disabled:text-black/50";
const label = "block text-xs font-semibold tracking-wide uppercase mb-2 text-[#2b261f]";
const primaryButton =
  "inline-flex w-full items-center justify-center rounded-full border border-[#2b261f] py-3.5 text-xs font-semibold tracking-[0.12em] text-[#2b261f] transition-colors hover:bg-[#2b261f] hover:text-white disabled:opacity-60";

export default function AccountClient({ title, subtitle }: { title: string; subtitle: string }) {
  const dict = useDictionary().account;
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<AccountOrder[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    if (!getCustomerToken()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    accountFetch<Customer>("/api/account/me")
      .then((me) => {
        if (cancelled) return;
        setCustomer(me);
        return accountFetch<AccountOrder[]>("/api/account/orders").then((list) => {
          if (!cancelled) setOrders(list);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(dict.loadError);
      });
    return () => {
      cancelled = true;
    };
  }, [router, dict.loadError]);

  const signOut = () => {
    clearCustomerToken();
    router.push("/login");
  };

  const heading = (
    <div className="pt-12 pb-6">
      <h1 className="font-serif-display text-[38px] font-normal tracking-[0.02em] mb-2">{title}</h1>
      <p className="text-sm text-black/60 leading-relaxed">{subtitle}</p>
    </div>
  );

  if (loadError) {
    return (
      <div className="mx-auto max-w-[760px] px-6 pb-16">
        {heading}
        <p role="alert" className="border border-red-700/30 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {loadError}
        </p>
        <Link href="/login" className="mt-4 inline-block text-sm underline">
          {dict.myAccount}
        </Link>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-[760px] px-6 pb-16">
        {heading}
        <p className="text-sm text-black/50">{dict.loading}</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: dict.profileTab },
    { key: "edit", label: dict.editTab },
    { key: "orders", label: dict.ordersTab },
  ];

  return (
    <div className="mx-auto max-w-[760px] px-6 pb-16">
      <div className="flex items-end justify-between gap-4">
        {heading}
        <button
          type="button"
          onClick={signOut}
          className="mb-7 shrink-0 text-xs text-black/55 underline hover:text-[#2b261f]"
        >
          {dict.signOut}
        </button>
      </div>
      <div className="mb-6 border-b border-black/10">
        {/* Three equal columns on phones (labels may wrap to two lines),
            a normal row of tabs from sm up. */}
        <div role="tablist" className="-mb-px grid grid-cols-3 gap-x-3 sm:flex sm:gap-x-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={`border-b-2 pb-3 text-[11px] leading-snug sm:text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                tab === t.key
                  ? "border-[#2b261f] text-[#2b261f]"
                  : "border-transparent text-black/45 hover:text-[#2b261f]"
              }`}
            >
              {t.label}
              {t.key === "orders" && orders ? ` (${orders.length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {tab === "profile" && <ProfileView customer={customer} onEdit={() => setTab("edit")} />}
      {tab === "edit" && <EditView customer={customer} onSaved={setCustomer} />}
      {tab === "orders" && <OrdersView orders={orders} />}
    </div>
  );
}

function ProfileView({ customer, onEdit }: { customer: Customer; onEdit: () => void }) {
  const dict = useDictionary().account;
  const rows: [string, string][] = [
    [dict.name, customer.full_name],
    [dict.email, customer.email],
    [dict.phone, customer.phone || dict.notProvided],
    [dict.memberSince, new Date(customer.created_at).toLocaleDateString()],
  ];
  return (
    <div className={card}>
      <dl className="divide-y divide-black/10">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between">
            <dt className="text-xs font-semibold uppercase tracking-wide text-black/50">{k}</dt>
            <dd className="break-all text-sm text-[#2b261f] sm:text-right">{v}</dd>
          </div>
        ))}
      </dl>
      <button type="button" onClick={onEdit} className={`${primaryButton} mt-6`}>
        {dict.editTab.toUpperCase()}
      </button>
    </div>
  );
}

function Message({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <p
      role={msg.ok ? "status" : "alert"}
      className={`px-4 py-2.5 text-sm ${
        msg.ok ? "border border-green-700/30 bg-green-50 text-green-800" : "border border-red-700/30 bg-red-50 text-red-700"
      }`}
    >
      {msg.text}
    </p>
  );
}

function EditView({ customer, onSaved }: { customer: Customer; onSaved: (c: Customer) => void }) {
  const dict = useDictionary().account;

  const [fullName, setFullName] = useState(customer.full_name);
  const [phone, setPhone] = useState(customer.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const updated = await accountFetch<Customer>("/api/account/me", {
        method: "PUT",
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() }),
      });
      onSaved(updated);
      setProfileMsg({ ok: true, text: dict.saved });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof ApiError ? err.message : dict.loadError });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ ok: false, text: dict.passwordMismatch });
      return;
    }
    setChanging(true);
    try {
      await accountFetch("/api/account/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ ok: true, text: dict.passwordChanged });
    } catch (err) {
      setPasswordMsg({ ok: false, text: err instanceof ApiError ? err.message : dict.loadError });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className={`${card} space-y-5`}>
        <h2 className="font-serif-display text-xl font-normal text-[#2b261f]">{dict.editDetails}</h2>
        <div>
          <label htmlFor="acc-name" className={label}>{dict.name}</label>
          <input
            id="acc-name"
            required
            maxLength={160}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={saving}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="acc-email" className={label}>{dict.email}</label>
          <input id="acc-email" type="email" value={customer.email} disabled className={field} />
          <p className="mt-1.5 text-xs text-black/45">{dict.emailLocked}</p>
        </div>
        <div>
          <label htmlFor="acc-phone" className={label}>{dict.phone}</label>
          <input
            id="acc-phone"
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={saving}
            className={field}
          />
        </div>
        <Message msg={profileMsg} />
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? dict.saving : dict.save}
        </button>
      </form>

      <form onSubmit={changePassword} className={`${card} space-y-5`}>
        <h2 className="font-serif-display text-xl font-normal text-[#2b261f]">{dict.changePassword}</h2>
        <div>
          <label htmlFor="acc-current" className={label}>{dict.currentPassword}</label>
          <input
            id="acc-current"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={changing}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="acc-new" className={label}>{dict.newPassword}</label>
          <input
            id="acc-new"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={changing}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="acc-confirm" className={label}>{dict.confirmNewPassword}</label>
          <input
            id="acc-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={changing}
            className={field}
          />
        </div>
        <Message msg={passwordMsg} />
        <button type="submit" disabled={changing} className={primaryButton}>
          {changing ? dict.saving : dict.updatePassword}
        </button>
      </form>
    </div>
  );
}

function OrdersView({ orders }: { orders: AccountOrder[] | null }) {
  const dict = useDictionary().account;
  const money = useMoney();
  const [openId, setOpenId] = useState<number | null>(null);

  const statusLabel: Record<string, string> = {
    "Đang xử lý": dict.statusProcessing,
    "Đã giao": dict.statusDelivered,
    "Đã hủy": dict.statusCancelled,
  };

  if (!orders) return <p className="text-sm text-black/50">{dict.loading}</p>;

  const guestNote = (
    <p className="text-xs text-black/50">
      {dict.ordersGuestNote}{" "}
      <Link href="/pages/track-order" className="text-[#2b261f] underline hover:text-gold">
        {dict.trackOrder}
      </Link>
    </p>
  );

  if (orders.length === 0) {
    return (
      <div className={`${card} space-y-3 text-center`}>
        <p className="text-sm text-[#2b261f]">{dict.ordersEmpty}</p>
        {guestNote}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const open = openId === o.id;
        return (
          <div key={o.id} className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-ui text-sm">
                <strong>{o.order_code}</strong>
              </p>
              <span className="inline-flex items-center rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-[#2b261f]">
                {statusLabel[o.status] ?? o.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-black/55">
              <span>
                {dict.placedOn} {new Date(o.created_at).toLocaleDateString()} ·{" "}
                {PAYMENT_LABEL[o.payment_method] ?? o.payment_method} · {dict.qty}{" "}
                {o.items.reduce((n, i) => n + i.qty, 0)}
              </span>
              <span className="text-sm font-semibold text-[#2b261f]">
                {dict.total} {money(o.total)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setOpenId(open ? null : o.id)}
              aria-expanded={open}
              className="mt-3 text-xs text-[#2b261f] underline hover:text-gold"
            >
              {open ? dict.hideDetails : dict.viewDetails}
            </button>

            {open && (
              <div className="mt-4 space-y-4">
                <ul className="divide-y divide-black/10 border-y border-black/10">
                  {o.items.map((item) => {
                    const name = item.product_slug ? (
                      <Link href={`/product/${item.product_slug}`} className="hover:underline">
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    );
                    return (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] bg-[#f5f2ee]">
                          {item.image_url && (
                            <Image src={item.image_url} alt={item.name} fill sizes="56px" className="object-cover" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[#2b261f]">{name}</p>
                          <p className="text-xs text-black/50">
                            {item.material ? `${item.material} · ` : ""}
                            {dict.qty} {item.qty}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm text-[#2b261f]">
                          {money(Number(item.price) * item.qty)}
                        </p>
                      </li>
                    );
                  })}
                </ul>

                <div className="space-y-1.5 font-ui text-sm">
                  <div className="flex justify-between text-black/60">
                    <span>{dict.subtotal}</span>
                    <span>{money(o.subtotal)}</span>
                  </div>
                  {Number(o.discount_amount) > 0 && (
                    <div className="flex justify-between text-black/60">
                      <span>{dict.discount}</span>
                      <span>-{money(o.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-black/60">
                    <span>{dict.shipping}</span>
                    <span>{Number(o.shipping_fee) > 0 ? money(o.shipping_fee) : dict.free}</span>
                  </div>
                  {Number(o.tax_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-black/60">
                      <span>{dict.tax}</span>
                      <span>{money(o.tax_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black/10 pt-1.5 text-base font-semibold text-[#2b261f]">
                    <span>{dict.total}</span>
                    <span>{money(o.total)}</span>
                  </div>
                </div>

                <p className="text-xs text-black/55">
                  <span className="font-semibold uppercase tracking-wide">{dict.shipTo}:</span>{" "}
                  {[o.address, o.city, o.postal_code, o.country].filter(Boolean).join(", ")}
                </p>
              </div>
            )}
          </div>
        );
      })}
      {guestNote}
    </div>
  );
}
