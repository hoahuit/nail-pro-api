import { Request, Response } from "express";
import { prisma } from "../config/database";

export const getAll = async (_req: Request, res: Response) => {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true, bio: true, avatar: true },
  });
  res.json({ success: true, data: staff });
};