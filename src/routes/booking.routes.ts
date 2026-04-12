import { Router } from "express";
import * as booking from "../controllers/booking.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);
router.post("/", booking.create);
router.get("/mine", booking.getMyBookings);
router.patch("/:id/cancel", booking.cancel);
// Admin only
router.get("/", authorize("ADMIN", "STAFF"), booking.getAll);
router.patch("/:id/status", authorize("ADMIN", "STAFF"), booking.updateStatus);
export default router;