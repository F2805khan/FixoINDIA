import AuthMethodSetting from "../models/AuthMethodSetting.js";

/* Every login/signup method the app supports.
   Add a new entry here if a new auth method is introduced. */
export const authMethodDefinitions = [
  {
    id: "password",
    method: "Password",
    description: "Signup/login with email or phone + password"
  },
  {
    id: "otp",
    method: "OTP",
    description: "Signup/login with a one-time email OTP"
  },
  {
    id: "google",
    method: "Google",
    description: "Continue with Google (Gmail)"
  }
];

const ensureAuthMethodSettings = async () => {
  await AuthMethodSetting.bulkCreate(
    authMethodDefinitions.map(({ method }) => ({
      method,
      signupEnabled: true,
      loginEnabled: true
    })),
    { ignoreDuplicates: true }
  );
};

export const getAuthMethodSettings = async () => {
  await ensureAuthMethodSettings();
  const settings = await AuthMethodSetting.findAll();
  const byMethod = new Map(settings.map((s) => [s.method, s]));

  return authMethodDefinitions.map((definition) => {
    const saved = byMethod.get(definition.method);
    return {
      ...definition,
      signupEnabled: saved?.signupEnabled ?? true,
      loginEnabled: saved?.loginEnabled ?? true
    };
  });
};

/**
 * Throws a 403 error if the given method (by id, e.g. "password", "otp", "google")
 * is disabled for the given action ("signup" or "login").
 */
export const assertAuthMethodEnabled = async (methodId, action) => {
  const definition = authMethodDefinitions.find((m) => m.id === methodId);
  if (!definition) return; // unknown method id, nothing to enforce

  const methods = await getAuthMethodSettings();
  const setting = methods.find((m) => m.id === methodId);
  const enabled = action === "signup" ? setting?.signupEnabled : setting?.loginEnabled;

  if (!enabled) {
    const error = new Error(
      action === "signup"
        ? `Signup with ${definition.method} is currently turned off.`
        : `Login with ${definition.method} is currently turned off.`
    );
    error.statusCode = 403;
    throw error;
  }
};

export const updateAuthMethodSettings = async (updates) => {
  if (!Array.isArray(updates) || !updates.length) {
    const error = new Error("At least one auth method setting is required");
    error.statusCode = 400;
    throw error;
  }

  const knownMethods = new Set(authMethodDefinitions.map(({ method }) => method));

  for (const update of updates) {
    const hasValidToggle =
      typeof update.signupEnabled === "boolean" || typeof update.loginEnabled === "boolean";
    if (!knownMethods.has(update.method) || !hasValidToggle) {
      const error = new Error(
        "Each entry requires a valid method and at least one of signupEnabled/loginEnabled"
      );
      error.statusCode = 400;
      throw error;
    }
  }

  const currentMethods = await getAuthMethodSettings();
  const byMethod = new Map(
    currentMethods.map(({ method, signupEnabled, loginEnabled }) => [
      method,
      { signupEnabled, loginEnabled }
    ])
  );

  updates.forEach(({ method, signupEnabled, loginEnabled }) => {
    const existing = byMethod.get(method);
    byMethod.set(method, {
      signupEnabled: typeof signupEnabled === "boolean" ? signupEnabled : existing.signupEnabled,
      loginEnabled: typeof loginEnabled === "boolean" ? loginEnabled : existing.loginEnabled
    });
  });

  if (![...byMethod.values()].some((m) => m.loginEnabled)) {
    const error = new Error("Keep at least one login method enabled");
    error.statusCode = 400;
    throw error;
  }

  await ensureAuthMethodSettings();
  await Promise.all(
    [...byMethod.entries()].map(([method, values]) =>
      AuthMethodSetting.update(values, { where: { method } })
    )
  );

  return getAuthMethodSettings();
};
