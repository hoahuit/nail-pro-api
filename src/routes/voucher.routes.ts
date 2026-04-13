import { Router } from "express";
import { asyncHandler } from "../middleware/async.middleware";
import { validateVoucher } from "../controllers/voucher.controller";

const router = Router();

// Public: kiểm tra mã voucher có hợp lệ không
router.post("/validate", asyncHandler(validateVoucher));

export default router;
