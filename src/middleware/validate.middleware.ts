import { Request, Response, NextFunction } from "express";

// Generic zod-based validator helper (used inline in controllers via zod)
export const validateRequest = (_req: Request, _res: Response, next: NextFunction) => next();

const validateBooking = [
  body('date').isDate().withMessage('Date must be a valid date'),
  body('time').isString().withMessage('Time must be a valid string'),
  body('serviceId').isInt().withMessage('Service ID must be an integer'),
  body('userId').isInt().withMessage('User ID must be an integer'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateService = [
  body('name').isString().withMessage('Name must be a valid string'),
  body('duration').isInt().withMessage('Duration must be an integer'),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

const validateStaff = [
  body('name').isString().withMessage('Name must be a valid string'),
  body('role').isString().withMessage('Role must be a valid string'),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export { validateBooking, validateService, validateStaff };