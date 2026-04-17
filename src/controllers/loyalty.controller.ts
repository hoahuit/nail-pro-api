import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { AuthRequest } from "../types";
import { Prisma } from "@prisma/client";

const DEFAULT_PROGRAM_CODE = "DEFAULT";
const rewardTypeSchema = z.enum(["FIXED", "PERCENT"]);

const ensureProgramConfig = async () => {
  const existing = await prisma.loyaltyProgramConfig.findUnique({
    where: { code: DEFAULT_PROGRAM_CODE },
    include: {
      rewardRules: { orderBy: { thresholdPoints: "asc" } },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.loyaltyProgramConfig.create({
    data: {
      code: DEFAULT_PROGRAM_CODE,
      pointsPerVisit: 1,
      rewardRules: {
        create: [
          { thresholdPoints: 5, rewardType: "FIXED", rewardValue: 5 },
          { thresholdPoints: 10, rewardType: "PERCENT", rewardValue: 20 },
        ],
      },
    },
    include: {
      rewardRules: { orderBy: { thresholdPoints: "asc" } },
    },
  });
};

const formatRules = (rules: Array<{ id: string; thresholdPoints: number; rewardType: string; rewardValue: Prisma.Decimal; isActive: boolean }>) => {
  return rules.map((r) => ({
    id: r.id,
    thresholdPoints: r.thresholdPoints,
    rewardType: r.rewardType,
    rewardValue: Number(r.rewardValue),
    isActive: r.isActive,
  }));
};

// ─── POST /admin/loyalty/add-points ── Admin ──────────────────────────────────
// Body: { phone, customerName?, amountSpent?, note? }
// Tích điểm theo lượt ghé, không phụ thuộc số tiền.
export const addPoints = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    phone:        z.string().min(6).max(20),
    customerName: z.string().min(1).optional(),
    staffName:    z.string().trim().min(1).max(100).optional(),
    amountSpent:  z.number().positive().optional(),
    note:         z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { phone, customerName, staffName, amountSpent, note } = parsed.data;
  const program = await ensureProgramConfig();
  const pointsEarned = program.pointsPerVisit;

  const existing = await prisma.loyaltyAccount.findUnique({ where: { phone } });
  if (existing && !existing.isActive) {
    return res.status(403).json({
      success: false,
      message: "This phone number is deactivated for loyalty points",
    });
  }

  const account = existing
    ? await prisma.loyaltyAccount.update({
        where: { phone },
        data: {
          totalPoints: { increment: pointsEarned },
          ...(customerName && { customerName }),
        },
      })
    : await prisma.loyaltyAccount.create({
        data: {
          phone,
          customerName: customerName ?? null,
          totalPoints: pointsEarned,
          isActive: true,
        },
      });

  await prisma.pointHistory.create({
    data: {
      loyaltyAccountId: account.id,
      points:           pointsEarned,
      type:             "EARN",
      amountSpent:      amountSpent ?? null,
      staffName:        staffName ?? null,
      note:             note ?? `Earned ${pointsEarned} point(s) for one visit`,
      addedByAdminId:   req.user!.id,
    },
  });

  res.json({
    success: true,
    message: `+${pointsEarned} points added for phone ${phone}`,
    data: {
      phone:        account.phone,
      customerName: account.customerName,
      pointsEarned,
      totalPoints:  account.totalPoints,
      pointsPerVisit: program.pointsPerVisit,
      staffName: staffName ?? null,
    },
  });
};

// ─── GET /admin/loyalty/settings ─────────────────────────────────────────────
export const getProgramSettings = async (_req: Request, res: Response) => {
  const program = await ensureProgramConfig();

  return res.json({
    success: true,
    data: {
      id: program.id,
      code: program.code,
      pointsPerVisit: program.pointsPerVisit,
      rewardRules: formatRules(program.rewardRules),
    },
  });
};

// ─── PATCH /admin/loyalty/settings ───────────────────────────────────────────
export const updateProgramSettings = async (req: Request, res: Response) => {
  const schema = z.object({
    pointsPerVisit: z.coerce.number().int().min(1).max(100),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const program = await ensureProgramConfig();
  const updated = await prisma.loyaltyProgramConfig.update({
    where: { id: program.id },
    data: { pointsPerVisit: parsed.data.pointsPerVisit },
    include: {
      rewardRules: { orderBy: { thresholdPoints: "asc" } },
    },
  });

  return res.json({
    success: true,
    message: "Loyalty settings updated",
    data: {
      id: updated.id,
      code: updated.code,
      pointsPerVisit: updated.pointsPerVisit,
      rewardRules: formatRules(updated.rewardRules),
    },
  });
};

// ─── GET /admin/loyalty/reward-rules ─────────────────────────────────────────
export const listRewardRules = async (_req: Request, res: Response) => {
  const program = await ensureProgramConfig();
  return res.json({
    success: true,
    data: formatRules(program.rewardRules),
  });
};

// ─── POST /admin/loyalty/reward-rules ────────────────────────────────────────
export const createRewardRule = async (req: Request, res: Response) => {
  const schema = z.object({
    thresholdPoints: z.coerce.number().int().min(1),
    rewardType: rewardTypeSchema,
    rewardValue: z.coerce.number().positive(),
    isActive: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (data.rewardType === "PERCENT" && data.rewardValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rewardValue must be <= 100 for PERCENT",
        path: ["rewardValue"],
      });
    }
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const program = await ensureProgramConfig();
  const duplicate = await prisma.loyaltyRewardRule.findFirst({
    where: {
      programId: program.id,
      thresholdPoints: parsed.data.thresholdPoints,
    },
    select: { id: true },
  });
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: `Rule for threshold ${parsed.data.thresholdPoints} already exists`,
    });
  }

  const created = await prisma.loyaltyRewardRule.create({
    data: {
      programId: program.id,
      thresholdPoints: parsed.data.thresholdPoints,
      rewardType: parsed.data.rewardType,
      rewardValue: parsed.data.rewardValue,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: created.id,
      thresholdPoints: created.thresholdPoints,
      rewardType: created.rewardType,
      rewardValue: Number(created.rewardValue),
      isActive: created.isActive,
    },
  });
};

// ─── PATCH /admin/loyalty/reward-rules/:id ───────────────────────────────────
export const updateRewardRule = async (req: Request, res: Response) => {
  const schema = z.object({
    thresholdPoints: z.coerce.number().int().min(1).optional(),
    rewardType: rewardTypeSchema.optional(),
    rewardValue: z.coerce.number().positive().optional(),
    isActive: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
      });
    }
    if (data.rewardType === "PERCENT" && data.rewardValue && data.rewardValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "rewardValue must be <= 100 for PERCENT",
        path: ["rewardValue"],
      });
    }
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const existing = await prisma.loyaltyRewardRule.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Reward rule not found" });
  }

  const nextRewardType = parsed.data.rewardType ?? existing.rewardType;
  const nextRewardValue = parsed.data.rewardValue ?? Number(existing.rewardValue);
  if (nextRewardType === "PERCENT" && nextRewardValue > 100) {
    return res.status(400).json({
      success: false,
      message: "rewardValue must be <= 100 for PERCENT",
    });
  }

  if (parsed.data.thresholdPoints && parsed.data.thresholdPoints !== existing.thresholdPoints) {
    const duplicate = await prisma.loyaltyRewardRule.findFirst({
      where: {
        id: { not: existing.id },
        programId: existing.programId,
        thresholdPoints: parsed.data.thresholdPoints,
      },
      select: { id: true },
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `Rule for threshold ${parsed.data.thresholdPoints} already exists`,
      });
    }
  }

  const updated = await prisma.loyaltyRewardRule.update({
    where: { id: req.params.id },
    data: parsed.data,
  });

  return res.json({
    success: true,
    data: {
      id: updated.id,
      thresholdPoints: updated.thresholdPoints,
      rewardType: updated.rewardType,
      rewardValue: Number(updated.rewardValue),
      isActive: updated.isActive,
    },
  });
};

// ─── DELETE /admin/loyalty/reward-rules/:id ──────────────────────────────────
export const deleteRewardRule = async (req: Request, res: Response) => {
  const existing = await prisma.loyaltyRewardRule.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Reward rule not found" });
  }

  await prisma.loyaltyRewardRule.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: "Reward rule removed" });
};

// ─── POST /admin/loyalty/adjust ── Admin ──────────────────────────────────────
// Body: { phone, points (positive = add, negative = deduct), note }
// Điều chỉnh điểm thủ công (sửa lỗi, thưởng thêm, trừ điểm...)
export const adjustPoints = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    phone:  z.string().min(6).max(20),
    points: z.number().int().refine((v) => v !== 0, { message: "points must be non-zero" }),
    staffName: z.string().trim().min(1).max(100).optional(),
    note:   z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { phone, points, staffName, note } = parsed.data;

  const account = await prisma.loyaltyAccount.findUnique({ where: { phone } });
  if (!account) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
  }
  if (!account.isActive) {
    return res.status(403).json({ success: false, message: "Loyalty account is deactivated" });
  }

  const newTotal = account.totalPoints + points;
  if (newTotal < 0) {
    return res.status(400).json({
      success: false,
      message: `Cannot deduct ${Math.abs(points)} points. Current balance is only ${account.totalPoints} points.`,
    });
  }

  const updated = await prisma.loyaltyAccount.update({
    where: { phone },
    data:  { totalPoints: newTotal },
  });

  await prisma.pointHistory.create({
    data: {
      loyaltyAccountId: account.id,
      points,
      type:           "ADJUST",
      staffName:      staffName ?? null,
      note,
      addedByAdminId: req.user!.id,
    },
  });

  res.json({
    success: true,
    message: `Points adjusted by ${points > 0 ? "+" : ""}${points} for phone ${phone}`,
    data: {
      phone,
      customerName: updated.customerName,
      adjustment:   points,
      totalPoints:  updated.totalPoints,
    },
  });
};

// ─── GET /admin/loyalty/lookup?phone=xxx ── Admin ─────────────────────────────
export const adminLookup = async (req: Request, res: Response) => {
  const phone = req.query.phone as string;
  if (!phone) {
    return res.status(400).json({ success: false, message: "phone query param is required" });
  }

  const account = await prisma.loyaltyAccount.findUnique({
    where:   { phone },
    include: {
      history: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!account) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
  }

  const program = await ensureProgramConfig();
  const eligibleRewards = program.rewardRules
    .filter((r) => r.isActive && account.totalPoints >= r.thresholdPoints)
    .map((r) => ({
      id: r.id,
      thresholdPoints: r.thresholdPoints,
      rewardType: r.rewardType,
      rewardValue: Number(r.rewardValue),
    }));

  res.json({
    success: true,
    data: {
      ...account,
      eligibleRewards,
    },
  });
};

// ─── GET /loyalty/lookup?phone=xxx ── Public ──────────────────────────────────
// Khách tra cứu điểm bằng SĐT (không cần đăng nhập)
export const publicLookup = async (req: Request, res: Response) => {
  const phone = req.query.phone as string;
  if (!phone) {
    return res.status(400).json({ success: false, message: "phone query param is required" });
  }

  const account = await prisma.loyaltyAccount.findUnique({
    where:   { phone },
    select: {
      phone:        true,
      customerName: true,
      totalPoints:  true,
      isActive:     true,
      history: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          points:      true,
          type:        true,
          amountSpent: true,
          staffName:   true,
          note:        true,
          createdAt:   true,
        },
      },
    },
  });

  if (!account) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
  }
  if (!account.isActive) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
  }

  const program = await ensureProgramConfig();
  const eligibleRewards = program.rewardRules
    .filter((r) => r.isActive && account.totalPoints >= r.thresholdPoints)
    .map((r) => ({
      id: r.id,
      thresholdPoints: r.thresholdPoints,
      rewardType: r.rewardType,
      rewardValue: Number(r.rewardValue),
    }));

  res.json({
    success: true,
    data: {
      ...account,
      eligibleRewards,
    },
  });
};

// ─── GET /admin/loyalty ── Admin: danh sách tất cả tài khoản ─────────────────
export const listAccounts = async (req: Request, res: Response) => {
  const schema = z.object({
    search: z.string().optional(),
    includeInactive: z.coerce.boolean().default(false),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { search, includeInactive, page, limit } = parsed.data;
  const where = search
    ? {
        ...(includeInactive ? {} : { isActive: true }),
        OR: [
          { phone: { contains: search } },
          { customerName: { contains: search } },
        ],
      }
    : (includeInactive ? {} : { isActive: true });

  const [total, accounts] = await prisma.$transaction([
    prisma.loyaltyAccount.count({ where }),
    prisma.loyaltyAccount.findMany({
      where,
      orderBy: { totalPoints: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id:           true,
        phone:        true,
        customerName: true,
        totalPoints:  true,
        isActive:     true,
        createdAt:    true,
        updatedAt:    true,
      },
    }),
  ]);

  res.json({
    success: true,
    data: accounts,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

// ─── DELETE /admin/loyalty/accounts/:phone ── Admin ─────────────────────────
// Soft-delete account to block future point accumulation.
export const deleteLoyaltyAccount = async (req: Request, res: Response) => {
  const phone = decodeURIComponent(req.params.phone || "").trim();
  if (!phone) {
    return res.status(400).json({ success: false, message: "phone param is required" });
  }

  const account = await prisma.loyaltyAccount.findUnique({ where: { phone } });
  if (!account) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
  }

  if (!account.isActive) {
    return res.json({ success: true, message: "Loyalty account already deactivated" });
  }

  await prisma.loyaltyAccount.update({
    where: { phone },
    data: { isActive: false },
  });

  return res.json({
    success: true,
    message: `Loyalty account deactivated for phone ${phone}`,
  });
};
