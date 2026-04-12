import { Router } from "express";
import * as svc from "../controllers/service.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";

const router = Router();
router.get("/", svc.getAll);
router.get("/:id", svc.getById);
router.post("/", authenticate, authorize("ADMIN"), svc.create);
router.patch("/:id", authenticate, authorize("ADMIN"), svc.update);
router.delete("/:id", authenticate, authorize("ADMIN"), svc.remove);
export default router;