import { Request, Response, NextFunction } from "express";
import { ReportService } from "./reports.service";
import { asyncHandler } from "../../shared/middleware/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";

const reportService = new ReportService();

export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const stats = await reportService.getDashboardStats();
    sendSuccess(res, stats);
  },
);

export const getOrderAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const analytics = await reportService.getOrderAnalytics(startDate, endDate);
    sendSuccess(res, analytics);
  },
);

export const getStockMovementReport = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const locationId = req.query.locationId as string | undefined;

    const report = await reportService.getStockMovementReport(locationId);
    sendSuccess(res, { movements: report });
  },
);

export const getTransportJobAnalytics = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;
    const providerId = req.query.providerId as string | undefined;

    const analytics = await reportService.getTransportJobAnalytics(
      startDate,
      endDate,
      providerId,
    );

    sendSuccess(res, analytics);
  },
);
