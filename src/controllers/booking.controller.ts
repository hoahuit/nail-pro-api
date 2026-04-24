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

const serviceItemSchema = z.object({
  serviceId: z.string(),
  staffId:   optionalTrimmedString,
  startTime: z.string().datetime({ message: "startTime must be ISO 8601" }),
});

const createSchema = z.object({
  // Multi-service: use `services` array
  services: z.array(serviceItemSchema).min(1).optional(),
  // Legacy single-service fields (kept for backwards compat)
  serviceId:    z.string().optional(),
  staffId:      optionalTrimmedString,
  startTime:    z.string().datetime({ message: "startTime must be ISO 8601, e.g. 2026-04-20T10:00:00" }).optional(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(6),
  customerEmail: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().email().optional()),
  notes:        optionalTrimmedString,
  voucherCode:  optionalTrimmedString,
}).refine(
  (d) => d.services?.length || (d.serviceId && d.startTime),
  { message: "Provide either `services[]` or both `serviceId` and `startTime`" },
);

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
// Supports multi-service booking via `services[]` array.
// Body (multipart/form-data or JSON):
//   services: [{ serviceId, staffId?, startTime }]   ← multi-service
//   OR serviceId + startTime + staffId?               ← legacy single service
//   customerName, customerPhone, customerEmail?, notes?, voucherCode?, designImage?
export const create = async (req: AuthRequest, res: Response) => {
  // Parse body — supports both JSON and multipart (file upload)
  let bodyData: Record<string, unknown> = { ...req.body };

  // When sent as multipart, services arrives as a JSON string
  if (typeof bodyData.services === "string") {
    try {
      bodyData.services = JSON.parse(bodyData.services);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid `services` JSON" });
    }
  }

  const parsed = createSchema.safeParse(bodyData);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const {
    services: servicesInput,
    serviceId: legacyServiceId, staffId: legacyStaffId, startTime: legacyStartTime,
    customerName, customerPhone, customerEmail, notes, voucherCode,
  } = parsed.data;

  // Normalise to array of service items
  const serviceItems = servicesInput?.length
    ? servicesInput
    : [{ serviceId: legacyServiceId!, staffId: legacyStaffId, startTime: legacyStartTime! }];

  // Validate every service
  const resolvedServices: { serviceId: string; staffId: string | null; start: Date; end: Date; duration: number; price: number; name: string }[] = [];
  for (const item of serviceItems) {
    const svc = await prisma.service.findUnique({ where: { id: item.serviceId } });
    if (!svc || !svc.isActive) {
      return res.status(404).json({ success: false, message: `Service not found: ${item.serviceId}` });
    }
    if (item.staffId) {
      const staff = await prisma.staff.findUnique({ where: { id: item.staffId } });
      if (!staff || !staff.isActive) {
        return res.status(404).json({ success: false, message: `Staff not found: ${item.staffId}` });
      }
    }
    const start = new Date(item.startTime);
    const end   = new Date(start.getTime() + svc.duration * 60 * 1000);

    const sameSlotCount = await prisma.booking.count({
      where: { status: { notIn: ["CANCELLED"] }, startTime: start, endTime: end },
    });
    if (sameSlotCount >= MAX_IDENTICAL_SLOT_BOOKINGS) {
      return res.status(409).json({
        success: false,
        message: `Slot ${item.startTime} for service "${svc.name}" is fully booked.`,
      });
    }

    resolvedServices.push({ serviceId: item.serviceId, staffId: item.staffId ?? null, start, end, duration: svc.duration, price: +svc.price, name: svc.name });
  }

  const subTotal = resolvedServices.reduce((sum, s) => sum + s.price, 0);

  // Validate voucher against total
  let voucherId: string | null = null;
  let discountAmount = 0;
  if (voucherCode) {
    const voucherCheck = await checkVoucherValidity(voucherCode.toUpperCase(), subTotal);
    if (!voucherCheck.valid) {
      return res.status(400).json({ success: false, message: voucherCheck.message });
    }
    voucherId      = voucherCheck.voucher!.id;
    discountAmount = voucherCheck.discountAmount!;
  }

  // Overall booking window
  const bookingStart = resolvedServices.reduce((min, s) => s.start < min ? s.start : min, resolvedServices[0].start);
  const bookingEnd   = resolvedServices.reduce((max, s) => s.end > max ? s.end : max, resolvedServices[0].end);
  const totalDuration = resolvedServices.reduce((sum, s) => sum + s.duration, 0);

  // Design image path (if uploaded)
  const designImage = req.file ? `/uploads/bookings/${req.file.filename}` : null;

  // Use first service as primary (legacy fields) if single service, else null
  const primaryService = resolvedServices.length === 1 ? resolvedServices[0] : null;

  const booking = await prisma.booking.create({
    data: {
      userId:         req.user?.id ?? null,
      customerName,
      customerPhone,
      customerEmail:  customerEmail ?? null,
      serviceId:      primaryService?.serviceId ?? null,
      staffId:        primaryService?.staffId ?? null,
      startTime:      bookingStart,
      endTime:        bookingEnd,
      duration:       totalDuration,
      totalPrice:     subTotal,
      discountAmount: discountAmount > 0 ? discountAmount : null,
      finalPrice:     discountAmount > 0 ? +(subTotal - discountAmount).toFixed(2) : null,
      voucherId:      voucherId ?? null,
      status:         "PENDING",
      notes:          notes ?? null,
      designImage,
      items: {
        create: resolvedServices.map((s) => ({
          serviceId: s.serviceId,
          staffId:   s.staffId,
          startTime: s.start,
          endTime:   s.end,
          duration:  s.duration,
          price:     s.price,
        })),
      },
    },
    include: {
      service: { select: { name: true, category: true } },
      staff:   { select: { name: true } },
      items: {
        include: {
          service: { select: { name: true, category: true } },
          staff:   { select: { name: true } },
        },
      },
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
    service:   resolvedServices.map((s) => s.name).join(", "),
    startTime: bookingStart.toLocaleString("en-GB"),
    endTime:   bookingEnd.toLocaleString("en-GB"),
    staff:     primaryService?.staffId ? (booking.staff?.name ?? undefined) : undefined,
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
    service:       resolvedServices.map((s) => s.name).join(", "),
    startTime:     bookingStart.toLocaleString("en-GB"),
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
      items: {
        include: {
          service: { select: { name: true, category: true, image: true } },
          staff:   { select: { name: true, avatar: true } },
        },
      },
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
        items: {
          include: {
            service: { select: { name: true, category: true } },
            staff:   { select: { name: true } },
          },
        },
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
      items: {
        include: {
          service: true,
          staff:   { select: { name: true, avatar: true } },
        },
      },
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
        service:   existing.service?.name ?? "Service",
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
