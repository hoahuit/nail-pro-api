import { Request, Response, NextFunction } from "express";

// Generic zod-based validator helper (used inline in controllers via zod)
export const validateRequest = (_req: Request, _res: Response, next: NextFunction) => next();

const noopValidator = (_req: Request, _res: Response, next: NextFunction) => next();

const validateBooking = [noopValidator];

const validateService = [noopValidator];

const validateStaff = [noopValidator];

export { validateBooking, validateService, validateStaff };