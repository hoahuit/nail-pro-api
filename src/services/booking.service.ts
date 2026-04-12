// Booking logic is handled directly in booking.controller.ts using Prisma
// This file is kept for any future booking helper functions

export {};

const prisma = new PrismaClient();

export const createBooking = async (bookingData: Booking) => {
  try {
    const newBooking = await prisma.booking.create({
      data: bookingData,
    });
    return newBooking;
  } catch (error) {
    throw new Error(`Error creating booking: ${error.message}`);
  }
};

export const getBookingById = async (id: number) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
    });
    return booking;
  } catch (error) {
    throw new Error(`Error fetching booking: ${error.message}`);
  }
};

export const updateBooking = async (id: number, bookingData: Partial<Booking>) => {
  try {
    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: bookingData,
    });
    return updatedBooking;
  } catch (error) {
    throw new Error(`Error updating booking: ${error.message}`);
  }
};

export const deleteBooking = async (id: number) => {
  try {
    await prisma.booking.delete({
      where: { id },
    });
  } catch (error) {
    throw new Error(`Error deleting booking: ${error.message}`);
  }
};

export const getAllBookings = async () => {
  try {
    const bookings = await prisma.booking.findMany();
    return bookings;
  } catch (error) {
    throw new Error(`Error fetching bookings: ${error.message}`);
  }
};