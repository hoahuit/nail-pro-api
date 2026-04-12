import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  duration: number; // duration in minutes
}

export const createService = async (serviceData: Omit<Service, 'id'>) => {
  return await prisma.service.create({
    data: serviceData,
  });
};

export const getServiceById = async (id: number) => {
  return await prisma.service.findUnique({
    where: { id },
  });
};

export const getAllServices = async () => {
  return await prisma.service.findMany();
};

export const updateService = async (id: number, serviceData: Partial<Omit<Service, 'id'>>) => {
  return await prisma.service.update({
    where: { id },
    data: serviceData,
  });
};

export const deleteService = async (id: number) => {
  return await prisma.service.delete({
    where: { id },
  });
};