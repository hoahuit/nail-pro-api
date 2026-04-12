import { Response } from "express";
import { prisma } from "../config/database";
import { AuthRequest } from "../types";
import { sendBookingConfirmation } from "../services/email.service";
import { z } from "zod";

const bookingSchema = z.object({
  serviceId: z.string(),
  staffId: z.string().optional(),
  date: z.string().datetime(),
  notes: z.string().optional(),
});

export const create = async (req: AuthRequest, res: Response) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.errors });

  const { serviceId, staffId, date, notes } = parsed.data;
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });

  const booking = await prisma.booking.create({
    data: {
      userId: req.user!.id,
      serviceId,
      staffId,
      date: new Date(date),
      notes,
      totalPrice: service.price,
      status: "PENDING",
    },
    include: { service: true, staff: true, user: { select: { name: true, email: true } } },
  });

  try {
    await sendBookingConfirmation(booking.user.email, {
      name: booking.user.name,
      service: booking.service.name,
      date: new Date(date).toLocaleString("en-GB"),
      staff: booking.staff?.name,
    });
  } catch (e) {
    console.error("Email failed:", e);
  }

  res.status(201).json({ success: true, data: booking });
};

export const getMyBookings = async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.id },
    include: { service: true, staff: true },
    orderBy: { date: "desc" },
  });
  res.json({ success: true, data: bookings });
};

export const getAll = async (_req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    include: { service: true, staff: true, user: { select: { name: true, email: true, phone: true } } },
    orderBy: { date: "asc" },
  });
  res.json({ success: true, data: bookings });
};

export const updateStatus = async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status },
    include: { service: true, user: { select: { name: true, email: true } } },
  });
  res.json({ success: true, data: booking });
};

export const cancel = async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

  const updated = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
  });
  res.json({ success: true, data: updated });
};

const bookingService = new BookingService();

export const createBooking = async (req: Request, res: Response) => {
  try {
    const bookingData = req.body;
    const newBooking = await bookingService.createBooking(bookingData);
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: 'Error creating booking', error });
  }
};

export const getBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const booking = await bookingService.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving booking', error });
  }
};

export const updateBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const bookingData = req.body;
    const updatedBooking = await bookingService.updateBooking(bookingId, bookingData);
    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: 'Error updating booking', error });
  }
};

export const deleteBooking = async (req: Request, res: Response) => {
  try {
    const bookingId = req.params.id;
    const deleted = await bookingService.deleteBooking(bookingId);
    if (!deleted) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting booking', error });
  }
};