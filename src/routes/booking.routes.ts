import { Router } from "express";
import * as booking from "../controllers/booking.controller";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/async.middleware";

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// Check available time slots before booking
router.get("/available-slots", asyncHandler(booking.getAvailableSlots));

// Create booking — guest or logged-in user (optionalAuthenticate attaches user if token present)
router.post("/", optionalAuthenticate, asyncHandler(booking.create));

// ── Authenticated user ────────────────────────────────────────────────────────
router.get("/mine",       authenticate, asyncHandler(booking.getMyBookings));      // my bookings
router.get("/:id",        authenticate, asyncHandler(booking.getById));             // view single
router.patch("/:id/cancel", authenticate, asyncHandler(booking.cancel));           // cancel own

// ── Admin / Staff ─────────────────────────────────────────────────────────────
router.get("/",               authenticate, authorize("ADMIN", "STAFF"), asyncHandler(booking.getAll));        // list all
router.patch("/:id/status",   authenticate, authorize("ADMIN", "STAFF"), asyncHandler(booking.updateStatus)); // confirm/cancel/complete

export default router;