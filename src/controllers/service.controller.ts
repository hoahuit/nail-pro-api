import { Request, Response } from "express";
import { prisma } from "../config/database";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  duration: z.number().int().positive(),
  price: z.number().positive(),
  category: z.string(),
});

export const getAll = async (_req: Request, res: Response) => {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { category: "asc" },
  });
  res.json({ success: true, data: services });
};

export const getById = async (req: Request, res: Response) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) return res.status(404).json({ success: false, message: "Service not found" });
  res.json({ success: true, data: service });
};

export const create = async (req: Request, res: Response) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.errors });
  const service = await prisma.service.create({ data: parsed.data });
  res.status(201).json({ success: true, data: service });
};

export const update = async (req: Request, res: Response) => {
  const parsed = serviceSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.errors });
  const service = await prisma.service.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ success: true, data: service });
};

export const remove = async (req: Request, res: Response) => {
  await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true, message: "Service deactivated" });
};

// Create a new service
export const createService = async (req: Request, res: Response) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Error creating service', error });
  }
};

// Get all services
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await Service.findAll();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving services', error });
  }
};

// Get a service by ID
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving service', error });
  }
};

// Update a service
export const updateService = async (req: Request, res: Response) => {
  try {
    const [updated] = await Service.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updated) {
      return res.status(404).json({ message: 'Service not found' });
    }
    const updatedService = await Service.findByPk(req.params.id);
    res.status(200).json(updatedService);
  } catch (error) {
    res.status(500).json({ message: 'Error updating service', error });
  }
};

// Delete a service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const deleted = await Service.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting service', error });
  }
};