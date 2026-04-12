import { Router } from "express";
import * as auth from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/me", authenticate, auth.me);
export default router;