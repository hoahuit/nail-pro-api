import { Router } from "express";
import * as staff from "../controllers/staff.controller";
import { asyncHandler } from "../middleware/async.middleware";

const router = Router();
router.get("/", asyncHandler(staff.getAll));
export default router;