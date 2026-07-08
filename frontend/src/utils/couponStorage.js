const COUPON_CODE_KEY = "funservice-coupon-code";

export const readStoredCouponCode = () => {
  try {
    return localStorage.getItem(COUPON_CODE_KEY) || "";
  } catch {
    return "";
  }
};

export const writeStoredCouponCode = (code) => {
  try {
    if (code) localStorage.setItem(COUPON_CODE_KEY, code);
    else localStorage.removeItem(COUPON_CODE_KEY);
  } catch {
    /* ignore storage errors */
  }
};

export const clearStoredCouponCode = () => writeStoredCouponCode("");
