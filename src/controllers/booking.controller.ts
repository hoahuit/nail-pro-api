import { Request, Response } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "../types";
import {
  sendBookingConfirmation,
  sendSalonNotification,
  sendBookingStatusUpdate,
} from "../services/email.service";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { checkVoucherValidity } from "./voucher.controller";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const createSchema = z.object({
  serviceId:    z.string(),
  staffId:      optionalTrimmedString,
  startTime:    z.string().datetime({ message: "startTime must be ISO 8601, e.g. 2026-04-20T10:00:00" }),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().email().optional()),
  notes:        optionalTrimmedString,
  voucherCode:  optionalTrimmedString,
});

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});

const slotQuerySchema = z.object({
  serviceId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  staffId: optionalTrimmedString,
});

const listQuerySchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  staffId: optionalTrimmedString,
  search: optionalTrimmedString,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Salon business hours ─────────────────────────────────────────────────────
const OPEN_HOUR  = 9;   // 09:00
const CLOSE_HOUR = 18;  // 18:00
const SLOT_INTERVAL_MIN = 15; // generate a potential slot every 15 min
const MAX_IDENTICAL_SLOT_BOOKINGS = 3;

// ─── GET /bookings/available-slots ───────────────────────────────────────────
// Query: serviceId, date (YYYY-MM-DD), staffId? (optional)
// Returns array of ISO datetime strings the customer can pick
export const getAvailableSlots = async (req: Request, res: Response) => {
  const parsed = slotQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }
  const { serviceId, date, staffId } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  const durationMs     = service.duration * 60 * 1000;
  const intervalMs     = SLOT_INTERVAL_MIN * 60 * 1000;
  const openTime       = new Date(`${date}T${String(OPEN_HOUR).padStart(2, "0")}:00:00`);
  const closeTime      = new Date(`${date}T${String(CLOSE_HOUR).padStart(2, "0")}:00:00`);
  const latestStart    = closeTime.getTime() - durationMs;

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd   = new Date(`${date}T23:59:59`);
  const sameDayBookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ["CANCELLED"] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  const slotUsage = new Map<string, number>();
  for (const booking of sameDayBookings) {
    const key = `${booking.startTime.toISOString()}|${booking.endTime.toISOString()}`;
    slotUsage.set(key, (slotUsage.get(key) ?? 0) + 1);
  }

  const slots: string[] = [];
  let cursor = openTime.getTime();

  while (cursor <= latestStart) {
    const slotStart = new Date(cursor);
    const slotEnd   = new Date(cursor + durationMs);
    const key       = `${slotStart.toISOString()}|${slotEnd.toISOString()}`;
    if ((slotUsage.get(key) ?? 0) < MAX_IDENTICAL_SLOT_BOOKINGS) {
      slots.push(slotStart.toISOString());
    }
    cursor += intervalMs;
  }

  res.json({
    success: true,
    data: slots,
    meta: { date, serviceId, staffId: staffId ?? null, duration: service.duration },
  });
};

// ─── POST /bookings ───────────────────────────────────────────────────────────
// Public endpoint — works for both guests and logged-in users.
// Body: serviceId, staffId?, startTime, customerName, customerPhone, customerEmail?, notes?
export const create = async (req: AuthRequest, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const {
    serviceId, staffId, startTime,
    customerName, customerPhone, customerEmail, notes, voucherCode,
  } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  // Validate voucher if provided
  let voucherId: string | null = null;
  let discountAmount = 0;
  if (voucherCode) {
    const voucherCheck = await checkVoucherValidity(voucherCode.toUpperCase(), +service.price);
    if (!voucherCheck.valid) {
      return res.status(400).json({ success: false, message: voucherCheck.message });
    }
    voucherId      = voucherCheck.voucher!.id;
    discountAmount = voucherCheck.discountAmount!;
  }

  if (staffId) {
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.isActive) {
      return res.status(404).json({ success: false, message: "Staff member not found" });
    }
  }

  const start = new Date(startTime);
  const end   = new Date(start.getTime() + service.duration * 60 * 1000);

  const sameSlotCount = await prisma.booking.count({
    where: {
      status:    { notIn: ["CANCELLED"] },
      startTime: start,
      endTime:   end,
    },
  });
  if (sameSlotCount >= MAX_IDENTICAL_SLOT_BOOKINGS) {
    return res.status(409).json({
      success: false,
      message: `This slot already has ${MAX_IDENTICAL_SLOT_BOOKINGS} bookings. Please choose another time.`,
    });
  }

  const booking = await prisma.booking.create({
    data: {
      userId:        req.user?.id ?? null,
      customerName,
      customerPhone,
      customerEmail: customerEmail ?? null,
      serviceId,
      staffId:       staffId ?? null,
      startTime:     start,
      endTime:       end,
      duration:      service.duration,
      totalPrice:    service.price,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      finalPrice:    discountAmount > 0 ? +(+service.price - discountAmount).toFixed(2) : null,
      voucherId:     voucherId ?? null,
      status:        "PENDING",
      notes:         notes ?? null,
    },
    include: {
      service: { select: { name: true, category: true } },
      staff:   { select: { name: true } },
    },
  });

  // Increment voucher usedCount
  if (voucherId) {
    await prisma.voucher.update({
      where: { id: voucherId },
      data:  { usedCount: { increment: 1 } },
    });
  }

  // Resolve email target: customerEmail OR linked user's email
  let emailTarget = customerEmail ?? null;
  if (!emailTarget && req.user) {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });
    emailTarget = user?.email ?? null;
  }

  const emailPayload = {
    name:      customerName,
    service:   booking.service.name,
    startTime: start.toLocaleString("en-GB"),
    endTime:   end.toLocaleString("en-GB"),
    staff:     booking.staff?.name,
    bookingId: booking.id,
  };

  // Fire-and-forget — do not block the response
  if (emailTarget) {
    sendBookingConfirmation(emailTarget, emailPayload)
      .catch((e) => console.error("[email] confirmation:", e));
  } else {
    console.warn("[email] confirmation skipped: no customer email available", {
      bookingId: booking.id,
      customerName,
    });
  }

  sendSalonNotification({
    bookingId:     booking.id,
    customerName,
    customerPhone,
    customerEmail: emailTarget,
    service:       booking.service.name,
    startTime:     start.toLocaleString("en-GB"),
    staff:         booking.staff?.name,
  }).catch((e) => console.error("[email] salon notification:", e));

  res.status(201).json({
    success: true,
    message: "Booking created successfully. You will receive a confirmation email shortly.",
    data: booking,
  });
};

// ─── GET /bookings/mine ── Authenticated user's own bookings ──────────────────
export const getMyBookings = async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: {
      service: { select: { name: true, category: true, image: true } },
      staff:   { select: { name: true, avatar: true } },
    },
    orderBy: { startTime: "desc" },
  });
  res.json({ success: true, data: bookings });
};

// ─── GET /bookings ── Admin/Staff: list with filters ─────────────────────────
// Query: status?, date?, staffId?, search?, page?, limit?
export const getAll = async (req: AuthRequest, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }
  const { status, date, staffId, search, page, limit } = parsed.data;

  const where = {
    ...(status  && { status }),
    ...(staffId && { staffId }),
    ...(date && {
      startTime: {
        gte: new Date(`${date}T00:00:00`),
        lte: new Date(`${date}T23:59:59`),
      },
    }),
    ...(search && {
      OR: [
        { customerName:  { contains: search } },
        { customerPhone: { contains: search } },
        { customerEmail: { contains: search } },
      ],
    }),
  } as Prisma.BookingWhereInput;

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        service: { select: { name: true, category: true } },
        staff:   { select: { name: true } },
        user:    { select: { name: true, email: true, phone: true } },
      },
      orderBy: { startTime: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  res.json({
    success: true,
    data: bookings,
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  });
};

// ─── GET /bookings/:id ────────────────────────────────────────────────────────
export const getById = async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      service: true,
      staff:   { select: { name: true, avatar: true } },
      user:    { select: { name: true, email: true } },
    },
  });
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  const isOwner        = req.user && booking.userId === req.user.id;
  const isAdminOrStaff = req.user && ["ADMIN", "STAFF"].includes(req.user.role);
  if (!isOwner && !isAdminOrStaff) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  res.json({ success: true, data: booking });
};

// ─── PATCH /bookings/:id/status ── Admin/Staff ────────────────────────────────
// Body: { status: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW" | "PENDING" }
// Sends email to customer when CONFIRMED or CANCELLED.
export const updateStatus = async (req: AuthRequest, res: Response) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const existing = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      service: { select: { name: true } },
      staff:   { select: { name: true } },
    },
  });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  const booking = await prisma.booking.update({
    where:   { id: req.params.id },
    data:    { status: parsed.data.status },
    include: {
      service: { select: { name: true } },
      staff:   { select: { name: true } },
    },
  });

  // Notify customer on CONFIRMED or CANCELLED
  if (["CONFIRMED", "CANCELLED"].includes(parsed.data.status)) {
    let emailTarget = (existing as { customerEmail?: string | null }).customerEmail ?? null;
    if (!emailTarget && existing.userId) {
      const user = await prisma.user.findUnique({
        where: { id: existing.userId },
        select: { email: true },
      });
      emailTarget = user?.email ?? null;
    }
    if (emailTarget) {
      sendBookingStatusUpdate(emailTarget, {
        name:      existing.customerName,
        service:   existing.service.name,
        startTime: existing.startTime.toLocaleString("en-GB"),
        staff:     existing.staff?.name,
        status:    parsed.data.status as "CONFIRMED" | "CANCELLED",
        bookingId: existing.id,
      }).catch((e) => console.error("[email] status update:", e));
    } else {
      console.warn("[email] status update skipped: no customer email available", {
        bookingId: existing.id,
        status: parsed.data.status,
      });
    }
  }

  res.json({ success: true, data: booking });
};

// ─── PATCH /bookings/:id/cancel ── Authenticated user cancels own booking ──────
export const cancel = async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (booking.userId !== req.user!.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (booking.status === "CANCELLED") {
    return res.status(400).json({ success: false, message: "Booking is already cancelled" });
  }
  if (booking.status === "COMPLETED") {
    return res.status(400).json({ success: false, message: "Cannot cancel a completed booking" });
  }
  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data:  { status: "CANCELLED" },
  });
  res.json({ success: true, data: updated });
};
