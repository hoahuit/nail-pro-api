import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Staff {
  id: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createStaff = async (staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => {
  return await prisma.staff.create({
    data: staffData,
  });
};

export const getStaffById = async (id: number) => {
  return await prisma.staff.findUnique({
    where: { id },
  });
};

export const getAllStaff = async () => {
  return await prisma.staff.findMany();
};

export const updateStaff = async (id: number, staffData: Partial<Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return await prisma.staff.update({
    where: { id },
    data: staffData,
  });
};

export const deleteStaff = async (id: number) => {
  return await prisma.staff.delete({
    where: { id },
  });
};