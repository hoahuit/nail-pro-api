import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/error.middleware";
import { setupSwagger } from "./config/swagger";

const app = express();

// Trust reverse proxy (Nginx/Cloudflare) so req.ip is the real client IP.
app.set("trust proxy", 1);

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || (ENV.NODE_ENV === "production" ? 1000 : 300));
const apiLimiter = rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests",
});

app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);app.use(cors({ origin: ENV.FRONTEND_URL, credentials: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use(morgan(ENV.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

setupSwagger(app);

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.use("/api/v1", apiLimiter);
app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;