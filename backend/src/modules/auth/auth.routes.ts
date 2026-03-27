import { Router } from "express";
import { body } from "express-validator";
import {
  login,
  verifyToken,
  changePassword,
  getProfile,
  updateProfile,
  createUser,
} from "./auth.controller";
import { validate } from "../../shared/middleware/validator";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { ROLES } from "../../config/constants";

const router = Router();

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  login,
);

router.get("/verify", verifyToken);

router.get("/profile", authenticate, getProfile);

router.put(
  "/profile",
  authenticate,
  [
    body("firstName")
      .optional()
      .isString()
      .withMessage("First name must be a string")
      .trim()
      .notEmpty()
      .withMessage("First name cannot be empty"),
    body("lastName")
      .optional()
      .isString()
      .withMessage("Last name must be a string")
      .trim()
      .notEmpty()
      .withMessage("Last name cannot be empty"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(),
    validate,
  ],
  updateProfile,
);

router.post(
  "/change-password",
  authenticate,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    validate,
  ],
  changePassword,
);

router.post(
  "/users",
  authenticate,
  authorize(ROLES.MANAGER),
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("firstName").notEmpty().withMessage("First name is required"),
    body("lastName").notEmpty().withMessage("Last name is required"),
    body("role")
      .isIn([
        "RAW_STOCK_MANAGER",
        "PRODUCTION_CLIENT",
        "DISTRIBUTOR",
        "TRANSPORT_PROVIDER",
        "FINISHED_STOCK_MANAGER",
      ])
      .withMessage("Invalid role"),
    validate,
  ],
  createUser,
);

export default router;
