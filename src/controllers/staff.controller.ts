import { Request, Response } from "express";
import { prisma } from "../config/database";

export const getAll = async (_req: Request, res: Response) => {
  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    select: { id: true, name: true, bio: true, avatar: true },
  });
  res.json({ success: true, data: staff });
};

// Create a new staff member
export const createStaff = async (req: Request, res: Response) => {
  try {
    const staffData = req.body;
    const newStaff = await Staff.create({ data: staffData });
    res.status(201).json(newStaff);
  } catch (error) {
    res.status(500).json({ message: 'Error creating staff member', error });
  }
};

// Get all staff members
export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staffMembers = await Staff.findMany();
    res.status(200).json(staffMembers);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving staff members', error });
  }
};

// Get a staff member by ID
export const getStaffById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const staffMember = await Staff.findUnique({ where: { id: Number(id) } });
    if (!staffMember) {
      return res.status(404).json({ message: 'Staff member not found' });
    }
    res.status(200).json(staffMember);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving staff member', error });
  }
};

// Update a staff member
export const updateStaff = async (req: Request, res: Response) => {
  const { id } = req.params;
  const staffData = req.body;
  try {
    const updatedStaff = await Staff.update({
      where: { id: Number(id) },
      data: staffData,
    });
    res.status(200).json(updatedStaff);
  } catch (error) {
    res.status(500).json({ message: 'Error updating staff member', error });
  }
};

// Delete a staff member
export const deleteStaff = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await Staff.delete({ where: { id: Number(id) } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting staff member', error });
  }
};