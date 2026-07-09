const parseVersion = (value = "") =>
  String(value || "")
    .trim()
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

export const compareVersions = (left, right) => {
  const a = parseVersion(left);
  const b = parseVersion(right);

  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
};

export const isClientSupported = (clientVersion, minClientVersion) =>
  compareVersions(clientVersion, minClientVersion) >= 0;

export const getVersionMismatch = ({ clientAppVersion, clientApiVersion, server }) => {
  if (!server) return null;

  if (clientApiVersion && clientApiVersion !== server.apiVersion) {
    return {
      level: "critical",
      code: "API_VERSION_MISMATCH",
      message: "A newer app version is live. Please refresh to continue."
    };
  }

  if (clientAppVersion && clientAppVersion !== server.appVersion) {
    return {
      level: "soft",
      code: "APP_VERSION_MISMATCH",
      message: "An updated version is available. Refresh for the latest fixes."
    };
  }

  if (clientAppVersion && !isClientSupported(clientAppVersion, server.minClientVersion)) {
    return {
      level: "critical",
      code: "CLIENT_TOO_OLD",
      message: "This app build is too old. Please refresh the page."
    };
  }

  return null;
};
