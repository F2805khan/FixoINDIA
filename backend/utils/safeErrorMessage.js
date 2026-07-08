const PUBLIC_MESSAGES = {
  profile: "Could not save your profile. Please try again.",
  booking: "Could not complete this booking. Please try again.",
  coupon: "This coupon could not be applied. Please try another code.",
  default: "Something went wrong. Please try again."
};

const isInternalDbError = (message = "") =>
  /schema cache|could not find|relation .* does not exist|column .* of .* does not exist|duplicate key value/i.test(
    String(message || "")
  );

export const normalizeDbError = (error, { action = "default" } = {}) => {
  const raw = error?.message || String(error || "");
  const publicMessage = PUBLIC_MESSAGES[action] || PUBLIC_MESSAGES.default;

  if (isInternalDbError(raw)) {
    const err = new Error(publicMessage);
    err.internalMessage = raw;
    return err;
  }

  return error?.message ? error : new Error(publicMessage);
};

export const safeErrorMessage = (err, fallback = PUBLIC_MESSAGES.default) => {
  const raw = err?.internalMessage || err?.message || "";
  if (isInternalDbError(raw)) return fallback;
  return err?.message || fallback;
};
