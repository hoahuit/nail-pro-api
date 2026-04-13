import { Router } from "express";
import { asyncHandler } from "../middleware/async.middleware";
import { validateVoucher, listVouchers } from "../controllers/voucher.controller";

const router = Router();

// Public: danh sách voucher (chỉ active)
router.get("/", asyncHandler(listVouchers));

// Public: kiểm tra mã voucher có hợp lệ không
router.post("/validate", asyncHandler(validateVoucher));

export default router;
