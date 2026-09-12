export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  [key: string]: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void; escape?: boolean };
  theme?: { color?: string };
}

export interface RazorpayCheckout {
  open: () => void;
  close: () => void;
  on: (event: string, callback: () => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayCheckout;
  }
}

let loadPromise: Promise<void> | null = null;

/** Loads Razorpay checkout.js once per session and caches the promise. */
export function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        reject(new Error("Could not load the payment gateway. Check your connection and retry."));
      };
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

/** Builds a fake payment proof for the built-in simulator (no real keys). */
export function mockRazorpayProof(orderId: string, razorpayOrderId: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return {
    orderId,
    razorpayOrderId,
    razorpayPaymentId: `pay_mock_${Date.now().toString(36)}_${random}`,
    razorpaySignature: `signature_mock_${random}`,
  };
}