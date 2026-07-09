import {
  CLIENT_API_VERSION,
  CLIENT_APP_VERSION,
  CLIENT_BUILD_ID,
  CLIENT_MIN_VERSION
} from "../generated/appVersion.js";

const VERSION_MISMATCH_EVENT = "funservice:version-mismatch";

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

export const getLocalVersion = () => ({
  appVersion: CLIENT_APP_VERSION,
  apiVersion: CLIENT_API_VERSION,
  buildId: CLIENT_BUILD_ID,
  minClientVersion: CLIENT_MIN_VERSION
});

export const getVersionHeaders = () => ({
  "X-Client-App-Version": CLIENT_APP_VERSION,
  "X-Client-Api-Version": CLIENT_API_VERSION,
  "X-Client-Build-Id": CLIENT_BUILD_ID
});

export const evaluateServerVersion = (server = {}) => {
  if (!server?.appVersion && !server?.apiVersion) return null;

  if (server.apiVersion && server.apiVersion !== CLIENT_API_VERSION) {
    return {
      level: "critical",
      message: "Server update detected. Refresh the page to sync frontend and backend."
    };
  }

  if (server.appVersion && server.appVersion !== CLIENT_APP_VERSION) {
    return {
      level: "soft",
      message: "A newer app version is available. Refresh to get the latest update."
    };
  }

  if (server.minClientVersion && compareVersions(CLIENT_APP_VERSION, server.minClientVersion) < 0) {
    return {
      level: "critical",
      message: "This app build is outdated. Please refresh the page."
    };
  }

  return null;
};

export const publishVersionMismatch = (detail) => {
  window.dispatchEvent(new CustomEvent(VERSION_MISMATCH_EVENT, { detail }));
};

export const onVersionMismatch = (callback) => {
  const handler = (event) => callback(event.detail);
  window.addEventListener(VERSION_MISMATCH_EVENT, handler);
  return () => window.removeEventListener(VERSION_MISMATCH_EVENT, handler);
};

export const checkServerVersion = async (healthRequest) => {
  try {
    const server = await healthRequest();
    const mismatch = evaluateServerVersion(server);
    if (mismatch) publishVersionMismatch({ ...mismatch, server });
    return { server, mismatch };
  } catch {
    return { server: null, mismatch: null };
  }
};
