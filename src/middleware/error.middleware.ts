import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("\u274c", err.message);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      return res.status(400).json({
        success: false,
        message: "Invalid related resource reference in request.",
      });
    }
  }

  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
};

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
};