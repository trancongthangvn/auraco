/**
 * One flat shipping fee, waived once the goods subtotal reaches the free-
 * shipping threshold — both set by the admin (Admin → Cài đặt website).
 *
 * The checkout used to charge nothing whatever the order size: it sent a
 * hard-coded shipping_fee of 0, showed "FREE" unconditionally, and read the
 * threshold from a hard-coded 120 rather than the admin's setting (bug
 * report: "giá trị đơn hàng < 120$ nhưng vẫn freeship"). The server applies
 * the same rule (routes/orders-payments.js) and ignores any fee a client
 * sends, so what is shown here is what gets recorded.
 *
 * Deliberately a flat fee only: rates by country, weight or carrier are
 * outside the contract (Điều 2.2).
 */
export function shippingFeeFor(
  goodsSubtotal: number,
  fee: number | null | undefined,
  threshold: number | string | null | undefined
): number {
  const flat = Number(fee);
  if (!Number.isFinite(flat) || flat <= 0) return 0;
  const limit = Number(threshold);
  if (Number.isFinite(limit) && goodsSubtotal >= limit) return 0;
  return flat;
}

export type ShippingSettings = {
  shippingFee: number | null;
  freeShippingThreshold: number | string | null;
  taxPercent: number | null;
};
