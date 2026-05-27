import { Request, Response } from "express";
import { z } from "zod";
import {
  getMaxBookingsPerSlot,
  listSettings,
  upsertMaxBookingsPerSlot,
} from "../services/settings.service";

const updateSchema = z.object({
  maxBookingsPerSlot: z.coerce.number().int().min(1).optional(),
});

export const getSettings = async (_req: Request, res: Response) => {
  const [settings, maxBookingsPerSlot] = await Promise.all([
    listSettings(),
    getMaxBookingsPerSlot(),
  ]);

  res.json({
    success: true,
    data: {
      settings,
      maxBookingsPerSlot,
    },
  });
};

export const updateSettings = async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  if (parsed.data.maxBookingsPerSlot !== undefined) {
    await upsertMaxBookingsPerSlot(parsed.data.maxBookingsPerSlot);
  }

  const updated = await getMaxBookingsPerSlot();
  res.json({
    success: true,
    data: { maxBookingsPerSlot: updated },
  });
};
