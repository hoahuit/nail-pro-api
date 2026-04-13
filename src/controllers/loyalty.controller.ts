import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database";
import { AuthRequest } from "../types";

// £10 spent = 1 point
const POINTS_PER_CURRENCY = 10;

// ─── POST /admin/loyalty/add-points ── Admin ──────────────────────────────────
// Body: { phone, customerName?, amountSpent, note? }
// Tích điểm cho khách theo SĐT. Tự tạo tài khoản nếu chưa có.
export const addPoints = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    phone:        z.string().min(6).max(20),
    customerName: z.string().min(1).optional(),
    amountSpent:  z.number().positive(),
    note:         z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { phone, customerName, amountSpent, note } = parsed.data;
  const pointsEarned = Math.floor(amountSpent / POINTS_PER_CURRENCY);

  if (pointsEarned < 1) {
    return res.status(400).json({
      success: false,
      message: `Minimum £${POINTS_PER_CURRENCY} required to earn points. Amount £${amountSpent} earns 0 points.`,
    });
  }

  // Upsert: tạo mới nếu SĐT chưa có, hoặc cộng điểm vào tài khoản hiện có
  const account = await prisma.loyaltyAccount.upsert({
    where: { phone },
    update: {
      totalPoints: { increment: pointsEarned },
      ...(customerName && { customerName }),
    },
    create: {
      phone,
      customerName: customerName ?? null,
      totalPoints: pointsEarned,
    },
  });

  await prisma.pointHistory.create({
    data: {
      loyaltyAccountId: account.id,
      points:           pointsEarned,
      type:             "EARN",
      amountSpent,
      note:             note ?? `Earned ${pointsEarned} points for £${amountSpent} spent`,
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
    },
  });
};

// ─── POST /admin/loyalty/adjust ── Admin ──────────────────────────────────────
// Body: { phone, points (positive = add, negative = deduct), note }
// Điều chỉnh điểm thủ công (sửa lỗi, thưởng thêm, trừ điểm...)
export const adjustPoints = async (req: AuthRequest, res: Response) => {
  const schema = z.object({
    phone:  z.string().min(6).max(20),
    points: z.number().int().refine((v) => v !== 0, { message: "points must be non-zero" }),
    note:   z.string().min(1),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { phone, points, note } = parsed.data;

  const account = await prisma.loyaltyAccount.findUnique({ where: { phone } });
  if (!account) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
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

  res.json({ success: true, data: account });
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
      history: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          points:      true,
          type:        true,
          amountSpent: true,
          note:        true,
          createdAt:   true,
        },
      },
    },
  });

  if (!account) {
    return res.status(404).json({ success: false, message: "No loyalty account found for this phone number" });
  }

  res.json({ success: true, data: account });
};

// ─── GET /admin/loyalty ── Admin: danh sách tất cả tài khoản ─────────────────
export const listAccounts = async (req: Request, res: Response) => {
  const schema = z.object({
    search: z.string().optional(),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(20),
  });

  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { search, page, limit } = parsed.data;
  const where = search
    ? {
        OR: [
          { phone: { contains: search } },
          { customerName: { contains: search } },
        ],
      }
    : {};

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
