import PaymentMethodSetting from "../models/PaymentMethodSetting.js";

export const paymentMethodDefinitions = [
  { id: "upi", method: "UPI", type: "online", description: "Pay securely with any UPI app." },
  {
    id: "card",
    method: "Debit/Credit Card",
    type: "online",
    description: "Pay with a debit or credit card."
  },
  {
    id: "net-banking",
    method: "Net Banking",
    type: "online",
    description: "Pay from your bank account."
  },
  { id: "wallet", method: "Wallet", type: "online", description: "Pay from a supported wallet." },
  {
    id: "cash",
    method: "Cash on Service",
    type: "cash",
    description: "Pay the professional after the service."
  }
];

const ensurePaymentMethodSettings = async () => {
  await PaymentMethodSetting.bulkCreate(
    paymentMethodDefinitions.map(({ method }) => ({ method, enabled: true })),
    { ignoreDuplicates: true }
  );
};

export const getPaymentMethodSettings = async ({ enabledOnly = false } = {}) => {
  await ensurePaymentMethodSettings();
  const settings = await PaymentMethodSetting.findAll();
  const enabledByMethod = new Map(settings.map((setting) => [setting.method, setting.enabled]));
  const methods = paymentMethodDefinitions.map((definition) => ({
    ...definition,
    enabled: enabledByMethod.get(definition.method) ?? true
  }));
  return enabledOnly ? methods.filter((method) => method.enabled) : methods;
};

export const assertPaymentMethodEnabled = async (method) => {
  const methods = await getPaymentMethodSettings();
  const setting = methods.find((item) => item.method === method);

  if (!setting) {
    const error = new Error("Invalid payment method");
    error.statusCode = 400;
    throw error;
  }

  if (!setting.enabled) {
    const error = new Error(`${method} is currently unavailable`);
    error.statusCode = 400;
    throw error;
  }

  return setting;
};

export const updatePaymentMethodSettings = async (updates) => {
  const knownMethods = new Set(paymentMethodDefinitions.map(({ method }) => method));

  for (const update of updates) {
    if (!knownMethods.has(update.method) || typeof update.enabled !== "boolean") {
      const error = new Error("Each payment method requires a valid method and enabled value");
      error.statusCode = 400;
      throw error;
    }
  }

  const currentMethods = await getPaymentMethodSettings();
  const enabledByMethod = new Map(currentMethods.map(({ method, enabled }) => [method, enabled]));
  updates.forEach(({ method, enabled }) => enabledByMethod.set(method, enabled));

  if (![...enabledByMethod.values()].some(Boolean)) {
    const error = new Error("Keep at least one payment method enabled");
    error.statusCode = 400;
    throw error;
  }

  await Promise.all(
    updates.map(({ method, enabled }) =>
      PaymentMethodSetting.update({ enabled }, { where: { method } })
    )
  );

  return getPaymentMethodSettings();
};
