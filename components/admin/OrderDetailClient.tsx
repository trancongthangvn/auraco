"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { useImageZoom } from "@/components/admin/ImageZoomProvider";
import { apiFetch, ApiError } from "@/lib/api";
import type { OrderStatus } from "@/data/admin";
import { ChevronLeftIcon } from "@/components/icons";
import { Select } from "@/components/admin/ui/Field";
import Badge from "@/components/admin/ui/Badge";

const STATUSES: OrderStatus[] = ["Đang xử lý", "Đã giao", "Đã hủy"];

const STATUS_TONE: Record<OrderStatus, "success" | "warning" | "danger"> = {
  "Đang xử lý": "warning",
  "Đã giao": "success",
  "Đã hủy": "danger",
};

const BACK_LINK_CLASSES =
  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm text-black/60 " +
  "transition-all duration-150 ease-out hover:text-[#2b261f] hover:bg-black/5 active:scale-[0.97]";

type OrderItem = {
  id: number;
  product_id: number;
  name: string;
  material: string;
  price: string;
  qty: number;
  image_url: string | null;
};

type OrderDetail = {
  id: number;
  order_code: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  subtotal: string;
  shipping_fee: string;
  discount_amount: string;
  total: string;
  status: OrderStatus;
  payment_method: string;
  created_at: string;
  items: OrderItem[];
};

/** A payment_transactions row — for Cash App / Zelle this is the customer's
 *  uploaded screenshot plus the optional reference they typed, submitted
 *  from the checkout's QR payment screen. */
type PaymentTx = {
  id: number;
  method: string;
  amount: string;
  status: "Chờ xử lý" | "Đã thanh toán" | "Thất bại" | "Đã hủy";
  proof_image_url: string | null;
  reference_code: string | null;
  created_at: string;
};

const METHOD_LABEL: Record<string, string> = {
  cashapp: "Cash App",
  zelle: "Zelle",
  card: "Thẻ tín dụng",
  paypal: "PayPal",
  airwallex: "Airwallex",
};

export default function OrderDetailClient({ id }: { id: string }) {
  const { open: openZoom } = useImageZoom();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OrderDetail>(`/api/orders/${id}`)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Đã có lỗi xảy ra");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // The screenshot a customer uploads from the QR payment screen lands in
  // payment_transactions, which this page never read — so an admin could see
  // an order was paid "by Cash App" but not the proof itself (request: "bổ
  // sung thêm phần xem ảnh gửi trong thanh toán"). Fetched separately, after
  // the order, because the page is addressed by code or id and the
  // transactions filter needs the numeric id. That endpoint is admin-only:
  // a staff account gets a 403 and the section simply stays empty.
  const [txs, setTxs] = useState<PaymentTx[]>([]);
  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    apiFetch<{ transactions: PaymentTx[] }>(
      `/api/admin/payment-transactions?order_id=${order.id}&limit=100`
    )
      .then((data) => {
        if (!cancelled) setTxs(data.transactions);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [order]);

  const updateStatus = async (status: OrderStatus) => {
    if (!order) return;
    const previous = order;
    setOrder({ ...order, status });
    try {
      await apiFetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      setOrder(previous);
      setError(err instanceof ApiError ? err.message : "Không thể cập nhật trạng thái");
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <p className="text-sm text-black/50">Đang tải...</p>
      </AdminShell>
    );
  }

  if (error || !order) {
    return (
      <AdminShell>
        <p className="text-sm text-black/50">
          {error || `Không tìm thấy đơn hàng ${id}.`}
        </p>
        <Link href="/admin/orders" className={`${BACK_LINK_CLASSES} mt-4 -ml-2.5`}>
          <ChevronLeftIcon size={14} /> Quay lại danh sách đơn hàng
        </Link>
      </AdminShell>
    );
  }

  const subtotal = parseFloat(order.subtotal);
  const shippingFee = parseFloat(order.shipping_fee);
  const total = parseFloat(order.total);

  return (
    <AdminShell>
      <Link href="/admin/orders" className={`${BACK_LINK_CLASSES} mb-4 -ml-2.5`}>
        <ChevronLeftIcon size={14} /> Quay lại danh sách đơn hàng
      </Link>

      <PageHeader>
        <span className="text-sm text-black/50">Mã đơn {order.order_code}</span>
        <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
        <Select
          value={order.status}
          onChange={(e) => updateStatus(e.target.value as OrderStatus)}
          className="!w-auto"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-4">
              Sản phẩm
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div
                    onClick={() => item.image_url && openZoom(item.image_url, item.name)}
                    className={`relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-[#f5f2ee] ${
                      item.image_url ? "cursor-zoom-in" : ""
                    }`}
                  >
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.name}</p>
                    <p className="text-xs text-black/50">{item.material}</p>
                  </div>
                  <p className="text-sm text-black/50">x{item.qty}</p>
                  <p className="text-sm w-20 text-right">
                    ${(parseFloat(item.price) * item.qty).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-black/10 mt-4 pt-4 space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between text-black/60">
                <span>Tạm tính</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-black/60">
                <span>Vận chuyển</span>
                <span>
                  {shippingFee === 0 ? "Miễn phí" : `$${shippingFee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-black/10">
                <span>Tổng cộng</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Khách hàng
            </h2>
            <p className="text-sm">{order.customer_name}</p>
            <p className="text-sm text-black/60">{order.email}</p>
            <p className="text-sm text-black/60">{order.phone}</p>
          </div>

          <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Địa chỉ giao hàng
            </h2>
            <p className="text-sm text-black/70">{order.address}</p>
            <p className="text-sm text-black/70">{order.city}</p>
            <p className="text-sm text-black/70">{order.country}</p>
          </div>

          <div className="bg-white rounded-2xl border border-black/10 shadow-sm p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Thanh toán
            </h2>
            <p className="text-sm text-black/70">
              Phương thức: {METHOD_LABEL[order.payment_method] ?? order.payment_method}
            </p>
            <p className="text-sm text-black/70">
              Ngày đặt: {new Date(order.created_at).toLocaleDateString("vi-VN")}
            </p>

            {txs.length > 0 && (
              <div className="mt-4 space-y-4 border-t border-black/10 pt-4">
                <p className="text-xs font-medium uppercase tracking-wide text-black/50">
                  Ảnh khách gửi ({txs.length})
                </p>
                {txs.map((tx) => (
                  <div key={tx.id} className="space-y-2">
                    {tx.proof_image_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          openZoom(tx.proof_image_url as string, `Ảnh thanh toán ${order.order_code}`)
                        }
                        className="block w-full overflow-hidden rounded-xl border border-black/10 bg-black/[0.03]"
                        title="Bấm để phóng to"
                      >
                        {/* Plain <img>: a customer upload, shown as-is at full
                            resolution when zoomed so amounts stay legible. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tx.proof_image_url}
                          alt={`Ảnh thanh toán ${order.order_code}`}
                          className="max-h-[320px] w-full object-contain"
                        />
                      </button>
                    ) : (
                      <p className="text-xs italic text-black/40">Không có ảnh đính kèm.</p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-black/60">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          tx.status === "Đã thanh toán"
                            ? "bg-green-100 text-green-800"
                            : tx.status === "Chờ xử lý"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {tx.status}
                      </span>
                      <span>{new Date(tx.created_at).toLocaleString("vi-VN")}</span>
                    </div>
                    <p className="text-xs text-black/60">
                      {METHOD_LABEL[tx.method] ?? tx.method} · ${Number(tx.amount).toFixed(2)}
                    </p>
                    {tx.reference_code && (
                      <p className="text-xs text-black/60">
                        Mã tham chiếu: <span className="font-medium text-black/80">{tx.reference_code}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
