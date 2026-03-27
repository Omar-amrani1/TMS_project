import express, { Application, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config/env";
import { errorHandler } from "./shared/middleware/errorHandler";

// Import routes
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import productRoutes from "./modules/products/products.routes";
import locationRoutes from "./modules/locations/locations.routes";
import stockRoutes from "./modules/stock/stock.routes";
import transportRoutes from "./modules/transport/transport.routes";
import orderRoutes from "./modules/orders/orders.routes";
import reportRoutes from "./modules/reports/reports.routes";

const app: Application = express();

// ==================== MIDDLEWARE ====================

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }),
);

// Logging
if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ==================== HEALTH CHECK ====================

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Logistics Management Platform API is running",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Logistics Management Platform API",
    version: "1.0.0",
    documentation: "/api/v1",
  });
});

// ==================== API ROUTES ====================

const apiPrefix = config.api.prefix;

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/products`, productRoutes);
app.use(`${apiPrefix}/locations`, locationRoutes);
app.use(`${apiPrefix}/stock`, stockRoutes);
app.use(`${apiPrefix}/transport`, transportRoutes);
app.use(`${apiPrefix}/orders`, orderRoutes);
app.use(`${apiPrefix}/reports`, reportRoutes);

// ==================== 404 HANDLER ====================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    statusCode: 404,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// ==================== ERROR HANDLER ====================

app.use(errorHandler);

export default app;
