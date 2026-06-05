import asyncHandler from "../middleware/asyncHandler.js";

const reverseGeocodeCache = globalThis.funserviceReverseGeocodeCache || new Map();
globalThis.funserviceReverseGeocodeCache = reverseGeocodeCache;
globalThis.funserviceNominatimQueue = globalThis.funserviceNominatimQueue || Promise.resolve();
globalThis.funserviceNominatimLastRequestAt = globalThis.funserviceNominatimLastRequestAt || 0;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NOMINATIM_INTERVAL_MS = 1100;

const getCoordinate = (value, min, max) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate >= min && coordinate <= max ? coordinate : null;
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const lookupLocation = async (latitude, longitude) => {
  const waitTime = Math.max(
    0,
    NOMINATIM_INTERVAL_MS - (Date.now() - globalThis.funserviceNominatimLastRequestAt)
  );
  if (waitTime) await wait(waitTime);

  globalThis.funserviceNominatimLastRequestAt = Date.now();
  const query = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "10",
    addressdetails: "1"
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
      "User-Agent": "FunService/1.0 (support@funservice.in)"
    }
  });

  if (!response.ok) {
    throw new Error(`Location lookup failed with status ${response.status}`);
  }

  return response.json();
};

export const reverseGeocode = asyncHandler(async (req, res) => {
  const latitude = getCoordinate(req.query.latitude, -90, 90);
  const longitude = getCoordinate(req.query.longitude, -180, 180);

  if (latitude === null || longitude === null) {
    res.status(400);
    throw new Error("Valid latitude and longitude are required");
  }

  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = reverseGeocodeCache.get(cacheKey);
  if (cached?.expiresAt > Date.now()) {
    res.json(cached.value);
    return;
  }

  const request = () => lookupLocation(latitude, longitude);
  const result = await (globalThis.funserviceNominatimQueue =
    globalThis.funserviceNominatimQueue.then(request, request));
  const address = result.address || {};
  const value = {
    city:
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state_district ||
      address.state ||
      "",
    displayName: result.display_name || ""
  };

  if (reverseGeocodeCache.size >= 300) {
    reverseGeocodeCache.delete(reverseGeocodeCache.keys().next().value);
  }
  reverseGeocodeCache.set(cacheKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  res.json(value);
});
