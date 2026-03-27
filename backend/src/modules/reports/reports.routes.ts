import { Router } from "express";
import {
  getDashboardStats,
  getOrderAnalytics,
  getStockMovementReport,
  getTransportJobAnalytics,
} from "./reports.controller";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { ROLES } from "../../config/constants";

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.MANAGER)); // Only managers can access reports

router.get("/dashboard", getDashboardStats);
router.get("/orders", getOrderAnalytics);
router.get("/stock-movements", getStockMovementReport);
router.get("/transport-jobs", getTransportJobAnalytics);

export default router;
