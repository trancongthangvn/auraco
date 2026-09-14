// Shared between the checkout (which creates the order) and the /thankyou
// page (which shows it). The thank-you screen used to be a state inside
// /checkout, so its URL never changed after paying; it now has its own
// route, and the order it shows is handed over through sessionStorage.
//
// sessionStorage rather than an order code in the URL on purpose: order
// codes are short and sequential (AC-16, AC-17…), so a /thankyou?order=AC-16
// page that fetched and showed the order would let anyone read other
// customers' emails and purchases just by counting. sessionStorage stays in
// this tab, survives a reload of /thankyou, and is gone once the tab closes.

export type CreatedOrderItem = {
  id: number;
  name: string;
  material: string | null;
  price: string | number;
  qty: number;
  image_url: string | null;
  variant_label?: string | null;
  /** Joined from products (see ORDER_ITEMS_SQL server-side) so the
   *  confirmation screen can link each line to its own product page for a
   *  review. Null for a product deleted after the order was placed. */
  product_slug?: string | null;
};

export type CreatedOrder = {
  id: number;
  order_code: string;
  email?: string;
  total: string | number;
  payment_method: string;
  created_at?: string;
  items?: CreatedOrderItem[];
};

export type LastOrder = {
  order: CreatedOrder;
  /** True once a Cash App / Zelle screenshot was submitted, which is what
   *  switches on the "your payment proof is being reviewed" notice. */
  proofUploaded: boolean;
};

const LAST_ORDER_KEY = "aura-last-order";

export function saveLastOrder(value: LastOrder): void {
  try {
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode, disabled site data): /thankyou falls
    // back to its generic "order placed" message rather than failing.
  }
}

export function readLastOrder(): LastOrder | null {
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastOrder;
    return parsed && parsed.order && parsed.order.order_code ? parsed : null;
  } catch {
    return null;
  }
}
