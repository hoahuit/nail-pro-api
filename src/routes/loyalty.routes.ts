import { Router } from "express";
import { asyncHandler } from "../middleware/async.middleware";
import { publicLookup } from "../controllers/loyalty.controller";
import { validateVoucher } from "../controllers/voucher.controller";

const router = Router();

// Public: tra cứu điểm bằng SĐT (không cần đăng nhập)
router.get("/lookup", asyncHandler(publicLookup));

export default router;
