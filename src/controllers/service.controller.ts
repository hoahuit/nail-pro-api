import { Request, Response } from "express";
import { prisma } from "../config/database";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ─── Validation Schemas ──────────────────────────────────────────────────────

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  image: z.string().min(1).optional(),
  duration: z.number().int().positive(),
  price: z.number().positive(),
  category: z.string().min(1),
  isActive: z.boolean().optional(),
});

const filterSchema = z.object({
  // search
  search: z.string().optional(),
  // filter
  category: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minDuration: z.coerce.number().int().positive().optional(),
  maxDuration: z.coerce.number().int().positive().optional(),
  // sort
  sortBy: z
    .enum(["name", "price", "duration", "category", "createdAt"])
    .optional()
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
  // pagination
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ─── GET /services ────────────────────────────────────────────────────────────
// Query params:
//   search=<string>       – tìm theo name hoặc description
//   category=<string>     – lọc theo danh mục
//   isActive=true|false   – mặc định chỉ trả active (true)
//   minPrice=<number>     – giá tối thiểu
//   maxPrice=<number>     – giá tối đa
//   minDuration=<number>  – thời gian tối thiểu (phút)
//   maxDuration=<number>  – thời gian tối đa (phút)
//   sortBy=name|price|duration|category|createdAt (default: createdAt)
//   order=asc|desc        (default: asc)
//   page=<number>         (default: 1)
//   limit=<number>        (default: 20, max: 100)
export const getAll = async (req: Request, res: Response) => {
  const parsed = filterSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const {
    search,
    category,
    isActive,
    minPrice,
    maxPrice,
    minDuration,
    maxDuration,
    sortBy,
    order,
    page,
    limit,
  } = parsed.data;

  const where: Prisma.ServiceWhereInput = {
    isActive: isActive ?? true,
    ...(category && { category }),
    ...(search && {
      OR: [
        { name: { contains: search } },
        { description: { contains: search } },
      ],
    }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined && { gte: new Prisma.Decimal(minPrice) }),
            ...(maxPrice !== undefined && { lte: new Prisma.Decimal(maxPrice) }),
          },
        }
      : {}),
    ...(minDuration !== undefined || maxDuration !== undefined
      ? {
          duration: {
            ...(minDuration !== undefined && { gte: minDuration }),
            ...(maxDuration !== undefined && { lte: maxDuration }),
          },
        }
      : {}),
  };

  const [total, services] = await prisma.$transaction([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: services,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ─── GET /services/:id ────────────────────────────────────────────────────────
export const getById = async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  res.json({ success: true, data: service });
};

// ─── GET /services/categories ─────────────────────────────────────────────────
export const getCategories = async (_req: Request, res: Response) => {
  const rows = await prisma.service.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  res.json({ success: true, data: rows.map((r) => r.category) });
};

// ─── POST /services ───────────────────────────────────────────────────────────
export const create = async (req: Request, res: Response) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }
  const service = await prisma.service.create({ data: parsed.data });
  res.status(201).json({ success: true, data: service });
};

// ─── PATCH /services/:id ──────────────────────────────────────────────────────
export const update = async (req: Request, res: Response) => {
  const exists = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  const parsed = serviceSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  res.json({ success: true, data: service });
};

// ─── DELETE /services/:id  (soft-delete: isActive = false) ───────────────────
export const remove = async (req: Request, res: Response) => {
  const exists = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: "Service deactivated" });
};

// ─── DELETE /services/:id/hard  (hard-delete, ADMIN only) ────────────────────
export const hardRemove = async (req: Request, res: Response) => {
  const exists = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!exists) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  await prisma.service.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: "Service deleted" });
};