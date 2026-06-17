import { Op } from "sequelize";
import asyncHandler from "../middleware/asyncHandler.js";
import sequelize from "../config/sequelize.js";
import Service from "../models/Service.js";

const serviceFields = ["title", "description", "category", "price", "duration", "image", "rating", "region", "enabled"];

const normalizeServicePayload = (body, { partial = false } = {}) => {
  const payload = {};

  for (const field of serviceFields) {
    if (body[field] !== undefined) {
      payload[field] = body[field];
    }
  }

  for (const field of ["title", "description", "category", "duration", "image", "region"]) {
    if (payload[field] !== undefined) {
      payload[field] = String(payload[field]).trim();
    }
  }

  if (payload.price !== undefined) {
    payload.price = Number(payload.price);
  }

  if (payload.rating !== undefined) {
    payload.rating = Number(payload.rating);
  }

  if (payload.enabled !== undefined) {
    payload.enabled = payload.enabled === true || payload.enabled === "true";
  }

  const required = ["title", "description", "category", "price", "image"];
  const missing = required.filter(
    (field) => (!partial || payload[field] !== undefined) && (payload[field] === undefined || payload[field] === "")
  );

  if (
    missing.length ||
    (payload.price !== undefined && (!Number.isFinite(payload.price) || payload.price < 0)) ||
    (payload.rating !== undefined && !Number.isFinite(payload.rating))
  ) {
    return { error: "Service title, description, category, image, and a valid price are required" };
  }

  return { payload };
};

export const getServiceCategories = asyncHandler(async (req, res) => {
  const rows = await Service.findAll({
    attributes: ["category", [sequelize.fn("COUNT", sequelize.col("_id")), "count"]],
    where: {
      category: {
        [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }]
      }
    },
    group: ["category"],
    order: [["category", "ASC"]],
    raw: true
  });

  res.json(rows.map((row) => ({ name: row.category, count: Number(row.count) })));
});

export const getServices = asyncHandler(async (req, res) => {
  const { search, category, region } = req.query;
  const where = {};

  if (search) {
    where.title = { [Op.like]: `%${search}%` };
  }

  if (category && category !== "All Services" && category !== "More Services") {
    where.category = category;
  }

  if (region && region !== "All Regions") {
    where.region = { [Op.in]: ["All Regions", region] };
  }

  const services = await Service.findAll({
    where,
    order: [["createdAt", "DESC"]]
  });
  res.json(services);
});

export const getServiceById = asyncHandler(async (req, res) => {
  const service = await Service.findByPk(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  res.json(service);
});

export const createService = asyncHandler(async (req, res) => {
  const { payload, error } = normalizeServicePayload(req.body);

  if (error) {
    res.status(400);
    throw new Error(error);
  }

  const service = await Service.create(payload);
  res.status(201).json(service);
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findByPk(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  const { payload, error } = normalizeServicePayload(req.body, { partial: true });

  if (error) {
    res.status(400);
    throw new Error(error);
  }

  await service.update(payload);
  await service.reload();
  res.json(service);
});

export const deleteService = asyncHandler(async (req, res) => {
  const service = await Service.findByPk(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error("Service not found");
  }

  await service.destroy();
  res.json({ message: "Service deleted successfully" });
});
