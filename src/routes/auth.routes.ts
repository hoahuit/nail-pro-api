import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/async.middleware";

const router = Router();
router.post("/register", asyncHandler(auth.register));
router.post("/login", asyncHandler(auth.login));
router.get("/me", authenticate, asyncHandler(auth.me));
export default router;