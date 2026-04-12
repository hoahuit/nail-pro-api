import { Router } from "express";
import * as svc from "../controllers/service.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/async.middleware";

const router = Router();

// Public
router.get("/categories", asyncHandler(svc.getCategories));        // GET /services/categories
router.get("/", asyncHandler(svc.getAll));                          // GET /services?search=&category=&minPrice=...
router.get("/:id", asyncHandler(svc.getById));                      // GET /services/:id

// Admin only
router.post("/", authenticate, authorize("ADMIN"), asyncHandler(svc.create));                  // POST /services
router.patch("/:id", authenticate, authorize("ADMIN"), asyncHandler(svc.update));              // PATCH /services/:id
router.delete("/:id/hard", authenticate, authorize("ADMIN"), asyncHandler(svc.hardRemove));    // DELETE /services/:id/hard
router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(svc.remove));             // DELETE /services/:id (soft)

export default router;