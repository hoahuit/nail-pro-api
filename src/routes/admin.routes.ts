import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/async.middleware";
import {
  addPoints,
  adjustPoints,
  adminLookup,
  listAccounts,
  getProgramSettings,
  updateProgramSettings,
  listRewardRules,
  createRewardRule,
  updateRewardRule,
  deleteRewardRule,
  deleteLoyaltyAccount,
} from "../controllers/loyalty.controller";
import {
  createVoucher,
  listVouchers,
  getVoucherById,
  updateVoucher,
  deleteVoucher,
} from "../controllers/voucher.controller";
import {
  listDayOffs,
  upsertDayOff,
  deleteDayOff,
} from "../controllers/dayoff.controller";
import {
  getSettings,
  updateSettings,
} from "../controllers/settings.controller";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// ── Loyalty ──────────────────────────────────────────────────────────────────
router.get("/loyalty",                  asyncHandler(listAccounts));
router.get("/loyalty/lookup",           asyncHandler(adminLookup));
router.post("/loyalty/add-points",      asyncHandler(addPoints));
router.post("/loyalty/adjust",          asyncHandler(adjustPoints));
router.get("/loyalty/settings",         asyncHandler(getProgramSettings));
router.patch("/loyalty/settings",       asyncHandler(updateProgramSettings));
router.get("/loyalty/reward-rules",     asyncHandler(listRewardRules));
router.post("/loyalty/reward-rules",    asyncHandler(createRewardRule));
router.patch("/loyalty/reward-rules/:id", asyncHandler(updateRewardRule));
router.delete("/loyalty/reward-rules/:id", asyncHandler(deleteRewardRule));
router.delete("/loyalty/accounts/:phone", asyncHandler(deleteLoyaltyAccount));

// ── Vouchers ─────────────────────────────────────────────────────────────────
router.get("/vouchers",         asyncHandler(listVouchers));
router.get("/vouchers/:id",     asyncHandler(getVoucherById));
router.post("/vouchers",        asyncHandler(createVoucher));
router.patch("/vouchers/:id",   asyncHandler(updateVoucher));
router.delete("/vouchers/:id",  asyncHandler(deleteVoucher));

// ── Day Offs ─────────────────────────────────────────────────────────────────
router.get("/day-offs",         asyncHandler(listDayOffs));
router.post("/day-offs",        asyncHandler(upsertDayOff));
router.delete("/day-offs/:id",  asyncHandler(deleteDayOff));

// ── Settings ────────────────────────────────────────────────────────────────
router.get("/settings",          asyncHandler(getSettings));
router.patch("/settings",        asyncHandler(updateSettings));

export default router;
