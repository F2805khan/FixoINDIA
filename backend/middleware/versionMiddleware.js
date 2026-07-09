import { API_VERSION, APP_VERSION, BUILD_ID, getVersionPayload, MIN_CLIENT_VERSION } from "../utils/appVersion.js";
import { getVersionMismatch } from "../utils/versionCompatibility.js";

export const attachVersionHeaders = (req, res, next) => {
  res.setHeader("X-App-Version", APP_VERSION);
  res.setHeader("X-Api-Version", API_VERSION);
  res.setHeader("X-Build-Id", BUILD_ID);
  res.setHeader("X-Min-Client-Version", MIN_CLIENT_VERSION);
  next();
};

export const enforceClientVersion = (req, res, next) => {
  const clientAppVersion = req.get("X-Client-App-Version");
  const clientApiVersion = req.get("X-Client-Api-Version");

  if (!clientAppVersion && !clientApiVersion) {
    next();
    return;
  }

  const mismatch = getVersionMismatch({
    clientAppVersion,
    clientApiVersion,
    server: getVersionPayload()
  });

  if (!mismatch) {
    next();
    return;
  }

  if (process.env.NODE_ENV !== "production" && mismatch.level !== "critical") {
    next();
    return;
  }

  if (mismatch.level === "critical") {
    res.status(426).json({
      message: mismatch.message,
      code: mismatch.code,
      server: getVersionPayload()
    });
    return;
  }

  next();
};
