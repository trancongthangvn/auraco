// Keeps the Contact/Delivery form filled in across the PayPal/PayOS round
// trip. That leg is a hard `window.location.href` redirect both ways (not
// client routing — see handlePayNow), so returning from PayPal — whether the
// payment succeeded, was cancelled, or failed to capture — reloads the whole
// page and every useState in CheckoutClient resets to empty (bug report:
// "cứ mỗi thao tác back là nó mất hết lại điền lại từ đầu").
//
// sessionStorage, not localStorage: this is a draft of the CURRENT order
// attempt, not something that should reappear on an unrelated future visit
// in a new tab. It's cleared once an order actually goes through (see the
// call sites in CheckoutClient) so a later purchase doesn't start pre-filled
// with a stranger's leftover session on a shared machine.

export type CheckoutDraft = {
  email: string;
  marketingOptIn: boolean;
  country: string;
  firstName: string;
  lastName: string;
  company: string;
  address: string;
  apartment: string;
  city: string;
  postalCode: string;
  phone: string;
  smsOptIn: boolean;
};

const CHECKOUT_DRAFT_KEY = "aura-checkout-draft";

export function saveCheckoutDraft(value: CheckoutDraft): void {
  try {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked (private mode, disabled site data): the form just
    // behaves as it always did, with nothing carried across the redirect.
  }
}

export function readCheckoutDraft(): CheckoutDraft | null {
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft(): void {
  try {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // Nothing to clean up if storage was never reachable.
  }
}
