import { Router } from "express";
import authRoutes from "./auth.routes";
import serviceRoutes from "./service.routes";
import bookingRoutes from "./booking.routes";
import staffRoutes from "./staff.routes";
import uploadRoutes from "./upload.routes";

const router = Router();
router.use("/auth", authRoutes);
router.use("/services", serviceRoutes);
router.use("/bookings", bookingRoutes);
router.use("/staff", staffRoutes);
router.use("/upload", uploadRoutes);
export default router;