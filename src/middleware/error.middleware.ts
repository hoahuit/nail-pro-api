import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("\u274c", err.message);
  res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
};

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
};