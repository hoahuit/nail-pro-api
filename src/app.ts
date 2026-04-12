import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { ENV } from "./config/env";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/error.middleware";

const app = express();

app.use(helmet());
app.use(cors({ origin: ENV.FRONTEND_URL, credentials: true }));
app.use(morgan(ENV.NODE_ENV === "development" ? "dev" : "combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: "Too many requests" }));

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

export default app;