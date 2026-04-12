import { Router } from "express";
import * as staff from "../controllers/staff.controller";

const router = Router();
router.get("/", staff.getAll);
export default router;