import { Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { AuthRequest } from "../types";

const normalizeVoucherCode = (value: string) => value.trim().toUpperCase();

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  code:          z.string().min(3).max(50),
  type:          z.enum(["PERCENT", "FIXED"]),
  value:         z.number().positive(),
  minOrderValue: z.number().positive().optional(),
  maxUses:       z.number().int().positive().optional(),
  expiresAt:     z.string().datetime().optional(),
  isActive:      z.boolean().optional().default(true),
});

const updateSchema = z.object({
  isActive:  z.boolean().optional(),
  maxUses:   z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const listQuerySchema = z.object({
  isActive: z.enum(["true", "false"]).optional().transform((v) => v === undefined ? undefined : v === "true"),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

// ─── POST /admin/vouchers ─────────────────────────────────────────────────────
export const createVoucher = async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const normalizedCode = normalizeVoucherCode(parsed.data.code);
  const { type, value, minOrderValue, maxUses, expiresAt, isActive } = parsed.data;

  // Validate PERCENT <= 100
  if (type === "PERCENT" && value > 100) {
    return res.status(400).json({ success: false, message: "Percent discount cannot exceed 100%" });
  }

  const existing = await prisma.voucher.findUnique({ where: { code: normalizedCode } });
  if (existing) {
    return res.status(409).json({ success: false, message: "Voucher code already exists" });
  }

  const voucher = await prisma.voucher.create({
    data: {
      code: normalizedCode,
      type,
      value,
      minOrderValue: minOrderValue ?? null,
      maxUses:       maxUses ?? null,
      expiresAt:     expiresAt ? new Date(expiresAt) : null,
      isActive,
    },
  });

  res.status(201).json({ success: true, data: voucher });
};

// ─── GET /admin/vouchers ──────────────────────────────────────────────────────
export const listVouchers = async (req: AuthRequest, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }
  const { isActive, page, limit } = parsed.data;

  const where = isActive !== undefined ? { isActive } : {};

  const [total, vouchers] = await prisma.$transaction([
    prisma.voucher.count({ where }),
    prisma.voucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: vouchers,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

// ─── GET /admin/vouchers/:id ──────────────────────────────────────────────────
export const getVoucherById = async (req: AuthRequest, res: Response) => {
  const voucher = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!voucher) {
    return res.status(404).json({ success: false, message: "Voucher not found" });
  }
  res.json({ success: true, data: voucher });
};

// ─── PATCH /admin/vouchers/:id ────────────────────────────────────────────────
export const updateVoucher = async (req: AuthRequest, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const existing = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Voucher not found" });
  }

  const voucher = await prisma.voucher.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.isActive  !== undefined && { isActive: parsed.data.isActive }),
      ...(parsed.data.maxUses   !== undefined && { maxUses: parsed.data.maxUses }),
      ...(parsed.data.expiresAt !== undefined && {
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      }),
    },
  });

  res.json({ success: true, data: voucher });
};

// ─── DELETE /admin/vouchers/:id ───────────────────────────────────────────────
export const deleteVoucher = async (req: AuthRequest, res: Response) => {
  const existing = await prisma.voucher.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Voucher not found" });
  }

  await prisma.voucher.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: "Voucher deleted" });
};

// ─── POST /vouchers/validate ── Public ────────────────────────────────────────
// Body: { code, orderValue }
// Returns voucher info + calculatedDiscount if valid
export const validateVoucher = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    code:       z.string().min(1),
    orderValue: z.number().positive().optional(),
    totalPrice: z.number().positive().optional(),
  }).refine((d) => d.orderValue !== undefined || d.totalPrice !== undefined, {
    message: "Either orderValue or totalPrice is required",
    path: ["orderValue"],
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const code = normalizeVoucherCode(parsed.data.code);
  const orderValue = parsed.data.orderValue ?? parsed.data.totalPrice!;
  const result = await checkVoucherValidity(code, orderValue);

  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.json({
    success: true,
    data: {
      voucherId:          result.voucher!.id,
      code:               result.voucher!.code,
      type:               result.voucher!.type,
      value:              result.voucher!.value,
      discountAmount:     result.discountAmount,
      finalPrice:         +(orderValue - result.discountAmount!).toFixed(2),
    },
  });
};

// ─── Helper: validate voucher code against an order value ─────────────────────
export async function checkVoucherValidity(
  code: string,
  orderValue: number
): Promise<{ valid: boolean; message?: string; voucher?: any; discountAmount?: number }> {
  const normalizedCode = normalizeVoucherCode(code);
  const voucher = await prisma.voucher.findUnique({ where: { code: normalizedCode } });

  if (!voucher)           return { valid: false, message: "Voucher code not found" };
  if (!voucher.isActive)  return { valid: false, message: "Voucher is inactive" };
  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    return { valid: false, message: "Voucher has expired" };
  }
  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
    return { valid: false, message: "Voucher usage limit reached" };
  }
  if (voucher.minOrderValue !== null && orderValue < +voucher.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order value is £${voucher.minOrderValue} for this voucher`,
    };
  }

  let discountAmount: number;
  if (voucher.type === "PERCENT") {
    discountAmount = +(orderValue * (+voucher.value / 100)).toFixed(2);
  } else {
    // FIXED — cannot exceed order value
    discountAmount = Math.min(+voucher.value, orderValue);
  }

  return { valid: true, voucher, discountAmount };
}
