import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/async.middleware";
import {
  addPoints,
  adjustPoints,
  adminLookup,
  listAccounts,
} from "../controllers/loyalty.controller";
import {
  createVoucher,
  listVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
} from "../controllers/voucher.controller";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// ── Loyalty ──────────────────────────────────────────────────────────────────
router.get("/loyalty",                  asyncHandler(listAccounts));
router.get("/loyalty/lookup",           asyncHandler(adminLookup));
router.post("/loyalty/add-points",      asyncHandler(addPoints));
router.post("/loyalty/adjust",          asyncHandler(adjustPoints));

// ── Vouchers ─────────────────────────────────────────────────────────────────
router.get("/vouchers",         asyncHandler(listVouchers));
router.get("/vouchers/:id",     asyncHandler(getVoucherById));
router.post("/vouchers",        asyncHandler(createVoucher));
router.patch("/vouchers/:id",   asyncHandler(updateVoucher));
router.delete("/vouchers/:id",  asyncHandler(deleteVoucher));

export default router;
