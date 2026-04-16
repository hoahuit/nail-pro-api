import { Request, Response } from "express";
import { prisma } from "../config/database";
import { z } from "zod";

const dayOffSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  reason: z.string().trim().max(255).optional(),
});

export const listDayOffs = async (_req: Request, res: Response) => {
  const items = await prisma.salonDayOff.findMany({
    orderBy: { date: "asc" },
  });

  return res.json({ success: true, data: items });
};

export const upsertDayOff = async (req: Request, res: Response) => {
  const parsed = dayOffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const reason = parsed.data.reason?.trim();
  const item = await prisma.salonDayOff.upsert({
    where: { date: parsed.data.date },
    update: { reason: reason || null },
    create: { date: parsed.data.date, reason: reason || null },
  });

  return res.status(201).json({ success: true, data: item });
};

export const deleteDayOff = async (req: Request, res: Response) => {
  const existing = await prisma.salonDayOff.findUnique({
    where: { id: req.params.id },
  });

  if (!existing) {
    return res.status(404).json({ success: false, message: "Day off not found" });
  }

  await prisma.salonDayOff.delete({ where: { id: req.params.id } });
  return res.json({ success: true, message: "Day off removed" });
};

const publicDayOffQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
});

export const listPublicDayOffs = async (req: Request, res: Response) => {
  const parsed = publicDayOffQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { from, to } = parsed.data;
  if (from > to) {
    return res.status(400).json({
      success: false,
      message: "Invalid date range: from must be <= to",
    });
  }

  const items = await prisma.salonDayOff.findMany({
    where: {
      date: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      reason: true,
    },
  });

  return res.json({ success: true, data: items });
};
