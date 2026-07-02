import { Op } from "sequelize";
import asyncHandler from "../middleware/asyncHandler.js";
import BeautyArtist from "../models/BeautyArtist.js";

const artistFields = [
  "name",
  "specialty",
  "salonName",
  "region",
  "phone",
  "email",
  "image",
  "bio",
  "rating",
  "enabled",
  "services",
  "videoTitle",
  "videoUrl",
  "videoThumbnail"
];

const stringFields = [
  "name",
  "specialty",
  "salonName",
  "region",
  "phone",
  "email",
  "image",
  "bio",
  "videoTitle",
  "videoUrl",
  "videoThumbnail"
];

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeBeautyServices = (services) => {
  const rows = typeof services === "string" ? JSON.parse(services || "[]") : services;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((service, index) => {
      const title = String(service?.title || "").trim();
      const price = Number(service?.price);

      return {
        id: String(service?.id || slugify(`${title}-${index + 1}`)).trim(),
        title,
        description: String(service?.description || "").trim(),
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        duration: String(service?.duration || "60 mins").trim(),
        image: String(service?.image || "/images/site/beauty-salon.jpg").trim(),
        enabled: service?.enabled !== false
      };
    })
    .filter((service) => service.title);
};

const normalizeBeautyArtistPayload = (body, { partial = false } = {}) => {
  const payload = {};

  for (const field of artistFields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  for (const field of stringFields) {
    if (payload[field] !== undefined && payload[field] !== null) {
      payload[field] = String(payload[field]).trim();
    }
  }

  if (payload.rating !== undefined) {
    payload.rating = Number(payload.rating);
  }

  if (payload.enabled !== undefined) {
    payload.enabled = payload.enabled === true || payload.enabled === "true";
  }

  if (payload.services !== undefined) {
    try {
      payload.services = normalizeBeautyServices(payload.services);
    } catch {
      return { error: "Beauty services must be a valid service list" };
    }
  }

  if (!partial) {
    payload.specialty = payload.specialty || "Beauty Artist";
    payload.region = payload.region || "All Regions";
    payload.image = payload.image || "/images/site/expert-riya.jpg";
    payload.services = payload.services || [];
  }

  if ((!partial || payload.name !== undefined) && !payload.name) {
    return { error: "Artist name is required" };
  }

  if (payload.rating !== undefined && !Number.isFinite(payload.rating)) {
    return { error: "Artist rating must be a valid number" };
  }

  return { payload };
};

export const getBeautyArtists = asyncHandler(async (req, res) => {
  const { search, region, includeDisabled } = req.query;
  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { specialty: { [Op.like]: `%${search}%` } },
      { salonName: { [Op.like]: `%${search}%` } }
    ];
  }

  if (region && region !== "All Regions") {
    where.region = { [Op.in]: ["All Regions", region] };
  }

  if (includeDisabled !== "true") {
    where.enabled = true;
  }

  const artists = await BeautyArtist.findAll({
    where,
    order: [["createdAt", "DESC"]]
  });

  res.json(artists);
});

export const createBeautyArtist = asyncHandler(async (req, res) => {
  const { payload, error } = normalizeBeautyArtistPayload(req.body);

  if (error) {
    res.status(400);
    throw new Error(error);
  }

  const artist = await BeautyArtist.create(payload);
  res.status(201).json(artist);
});

export const updateBeautyArtist = asyncHandler(async (req, res) => {
  const artist = await BeautyArtist.findByPk(req.params.id);

  if (!artist) {
    res.status(404);
    throw new Error("Beauty artist not found");
  }

  const { payload, error } = normalizeBeautyArtistPayload(req.body, { partial: true });

  if (error) {
    res.status(400);
    throw new Error(error);
  }

  await artist.update(payload);
  await artist.reload();
  res.json(artist);
});

export const deleteBeautyArtist = asyncHandler(async (req, res) => {
  const artist = await BeautyArtist.findByPk(req.params.id);

  if (!artist) {
    res.status(404);
    throw new Error("Beauty artist not found");
  }

  await artist.destroy();
  res.json({ message: "Beauty artist deleted successfully" });
});
