import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { uploadServiceImage } from "../middleware/upload.middleware";

const router = Router();

// POST /api/v1/upload/service-image
// Admin only — upload a service image, returns the public URL
router.post(
  "/service-image",
  authenticate,
  authorize("ADMIN"),
  (req: Request, res: Response) => {
    uploadServiceImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file provided" });
      }
      const filePath = `uploads/services/${req.file.filename}`;
      const fullUrl = `${req.protocol}://${req.get("host")}/${filePath}`;
      // Store `filePath` in DB (portable), use `fullUrl` only for preview
      res.status(201).json({ success: true, path: filePath, url: fullUrl });
    });
  }
);

// DELETE /api/v1/upload/service-image/:filename
// Admin only — delete an uploaded image file
router.delete(
  "/service-image/:filename",
  authenticate,
  authorize("ADMIN"),
  (req: Request, res: Response) => {
    // Prevent path traversal — only allow simple filenames
    const filename = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), "uploads", "services", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    fs.unlinkSync(filePath);
    res.json({ success: true, message: "Image deleted" });
  }
);

export default router;
