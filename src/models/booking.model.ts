import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Booking {
  id: number;
  userId: number;
  serviceId: number;
  bookingDate: Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
}

export const createBooking = async (bookingData: Omit<Booking, 'id'>) => {
  return await prisma.booking.create({
    data: bookingData,
  });
};

export const getBookingById = async (id: number) => {
  return await prisma.booking.findUnique({
    where: { id },
  });
};

export const updateBooking = async (id: number, bookingData: Partial<Omit<Booking, 'id'>>) => {
  return await prisma.booking.update({
    where: { id },
    data: bookingData,
  });
};

export const deleteBooking = async (id: number) => {
  return await prisma.booking.delete({
    where: { id },
  });
};

export const getAllBookings = async () => {
  return await prisma.booking.findMany();
};