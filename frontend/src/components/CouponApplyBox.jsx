import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api } from "../api/client.js";
import { toast } from "../utils/notifications.js";
import { clearStoredCouponCode, readStoredCouponCode, writeStoredCouponCode } from "../utils/couponStorage.js";

const formatCouponError = (message = "") => {
  const raw = String(message || "").toLowerCase();

  if (raw.includes("invalid coupon") || raw.includes("not valid")) {
    return "This coupon code does not exist. Please check the code and try again.";
  }
  if (raw.includes("expired")) {
    return "This coupon has expired.";
  }
  if (raw.includes("inactive")) {
    return "This coupon is not active right now.";
  }
  if (raw.includes("usage limit")) {
    return "This coupon has already been used up.";
  }
  if (raw.includes("minimum order")) {
    return message;
  }

  return message || "This coupon could not be applied. Please try another code.";
};

export default function CouponApplyBox({
  orderAmount,
  user,
  appliedCoupon,
  onApplied,
  onRemoved,
  onLoginRequired,
  className = ""
}) {
  const [couponCode, setCouponCode] = useState(appliedCoupon?.code || "");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const previousAmount = useRef(orderAmount);
  const trimmedCode = couponCode.trim();
  const hasTypedCode = Boolean(trimmedCode);
  const isApplied = Boolean(appliedCoupon?.code);
  const showRemove = isApplied || hasTypedCode || Boolean(error);
  const showApply = !isApplied;
  const splitActions = showApply && showRemove;

  useEffect(() => {
    if (appliedCoupon?.code) {
      setCouponCode(appliedCoupon.code);
      setError("");
    }
  }, [appliedCoupon?.code]);

  useEffect(() => {
    const code = appliedCoupon?.code;
    if (!code || !orderAmount) {
      previousAmount.current = orderAmount;
      return;
    }

    if (previousAmount.current === orderAmount) return;
    previousAmount.current = orderAmount;

    let active = true;

    (async () => {
      try {
        const result = await api.applyCoupon({ code, orderAmount });
        if (active) {
          onApplied?.(result);
          writeStoredCouponCode(result.code);
          setError("");
        }
      } catch (applyError) {
        if (!active) return;
        onRemoved?.();
        setError(formatCouponError(applyError.message));
        toast.error(formatCouponError(applyError.message));
      }
    })();

    return () => {
      active = false;
    };
  }, [orderAmount, appliedCoupon?.code, onApplied, onRemoved]);

  const applyCoupon = async () => {
    if (!trimmedCode) {
      setError("Enter a coupon code.");
      return;
    }

    if (!user) {
      onLoginRequired?.();
      return;
    }

    if (!orderAmount || orderAmount <= 0) {
      setError("Add services before applying a coupon.");
      return;
    }

    setApplying(true);
    setError("");

    try {
      const result = await api.applyCoupon({ code: trimmedCode, orderAmount });
      onApplied?.(result);
      setCouponCode(result.code);
      writeStoredCouponCode(result.code);
      setError("");
      toast.success(`Coupon ${result.code} applied.`);
    } catch (applyError) {
      onRemoved?.();
      const message = formatCouponError(applyError.message);
      setError(message);
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  const clearCoupon = () => {
    if (isApplied) {
      onRemoved?.();
    }
    setCouponCode("");
    setError("");
    clearStoredCouponCode();
    toast.success(isApplied ? "Coupon removed." : "Coupon code cleared.");
  };

  const discountAmount = Number(appliedCoupon?.discountAmount) || 0;

  return (
    <div className={`coupon-apply-box ${error ? "has-error" : ""} ${className}`.trim()}>
      <p className="coupon-field-label">Have a coupon code?</p>

      <input
        className="coupon-code-input"
        value={couponCode}
        onChange={(event) => {
          setCouponCode(event.target.value.toUpperCase());
          setError("");
          if (isApplied) {
            onRemoved?.();
          }
        }}
        placeholder="SAVE100"
        disabled={applying || isApplied}
        aria-label="Coupon code"
        aria-invalid={Boolean(error)}
      />

      <div className={`coupon-action-buttons ${splitActions ? "is-split" : "is-single"}`}>
        {showApply && (
          <button
            className="btn btn-primary btn-small"
            type="button"
            onClick={applyCoupon}
            disabled={applying || !hasTypedCode}
          >
            {applying ? "Applying..." : "Apply"}
          </button>
        )}
        {showRemove && (
          <button className="btn btn-soft btn-small" type="button" onClick={clearCoupon} disabled={applying}>
            Remove
          </button>
        )}
      </div>

      {isApplied && (
        <p className="coupon-success">
          <CheckCircle2 size={14} /> {appliedCoupon.code} applied. You saved ₹{discountAmount}.
        </p>
      )}
      {error && (
        <p className="coupon-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
