"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminShell from "@/components/admin/AdminShell";
import PageHeader from "@/components/admin/PageHeader";
import { mockOrders, type OrderStatus } from "@/data/admin";
import { ChevronLeftIcon } from "@/components/icons";

const STATUSES: OrderStatus[] = ["Đang xử lý", "Đã giao", "Đã hủy"];

export default function OrderDetailClient({ id }: { id: string }) {
  const order = mockOrders.find((o) => o.id === id);
  const [status, setStatus] = useState<OrderStatus | null>(order?.status ?? null);

  if (!order || !status) {
    return (
      <AdminShell>
        <p className="text-sm text-black/50">Không tìm thấy đơn hàng {id}.</p>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-sm underline mt-4"
        >
          <ChevronLeftIcon size={14} /> Quay lại danh sách đơn hàng
        </Link>
      </AdminShell>
    );
  }

  const subtotal = order.items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const total = subtotal + order.shippingFee;

  return (
    <AdminShell>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1.5 text-sm text-black/60 hover:text-black mb-4"
      >
        <ChevronLeftIcon size={14} /> Quay lại danh sách đơn hàng
      </Link>

      <PageHeader>
        <span className="text-sm text-black/50">Mã đơn {order.id}</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className="text-sm border border-black/20 px-3 py-2"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-black/10 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-4">
              Sản phẩm
            </h2>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="relative h-14 w-14 shrink-0 bg-[#f5f2ee]">
                    <Image
                      src={item.img}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.name}</p>
                    <p className="text-xs text-black/50">{item.material}</p>
                  </div>
                  <p className="text-sm text-black/50">x{item.qty}</p>
                  <p className="text-sm w-20 text-right">
                    ${(item.price * item.qty).toFixed(2)}
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
                  {order.shippingFee === 0
                    ? "Miễn phí"
                    : `$${order.shippingFee.toFixed(2)}`}
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
          <div className="bg-white border border-black/10 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Khách hàng
            </h2>
            <p className="text-sm">{order.customer}</p>
            <p className="text-sm text-black/60">{order.email}</p>
            <p className="text-sm text-black/60">{order.phone}</p>
          </div>

          <div className="bg-white border border-black/10 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Địa chỉ giao hàng
            </h2>
            <p className="text-sm text-black/70">{order.address}</p>
            <p className="text-sm text-black/70">{order.city}</p>
            <p className="text-sm text-black/70">{order.country}</p>
          </div>

          <div className="bg-white border border-black/10 p-5">
            <h2 className="text-sm font-medium uppercase tracking-wide mb-3">
              Thanh toán
            </h2>
            <p className="text-sm text-black/70">
              Phương thức: {order.paymentMethod}
            </p>
            <p className="text-sm text-black/70">Ngày đặt: {order.date}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-black/40 mt-6">
        Dữ liệu đơn hàng minh họa, thay đổi trạng thái chỉ lưu tạm trong phiên
        demo.
      </p>
    </AdminShell>
  );
}
