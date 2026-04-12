import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createUser = async (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
  return await prisma.user.create({
    data,
  });
};

export const getUserById = async (id: number) => {
  return await prisma.user.findUnique({
    where: { id },
  });
};

export const getUserByEmail = async (email: string) => {
  return await prisma.user.findUnique({
    where: { email },
  });
};

export const updateUser = async (id: number, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>) => {
  return await prisma.user.update({
    where: { id },
    data,
  });
};

export const deleteUser = async (id: number) => {
  return await prisma.user.delete({
    where: { id },
  });
};