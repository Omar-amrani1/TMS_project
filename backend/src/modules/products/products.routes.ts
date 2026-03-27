import { Router } from "express";
import { body } from "express-validator";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getRawMaterials,
  getFinishedProducts,
} from "./products.controller";
import { validate } from "../../shared/middleware/validator";
import { authenticate, authorize } from "../../shared/middleware/auth";
import { ROLES } from "../../config/constants";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(ROLES.MANAGER),
  [
    body("name").notEmpty().withMessage("Product name is required"),
    body("sku").notEmpty().withMessage("SKU is required"),
    body("type")
      .isIn(["RAW_MATERIAL", "FINISHED_PRODUCT"])
      .withMessage("Valid product type is required"),
    body("unitWeight")
      .isFloat({ min: 0.01 })
      .withMessage("Unit weight must be greater than 0"),
    body("initialLocationId")
      .optional()
      .isString()
      .notEmpty()
      .withMessage("initialLocationId must be a non-empty string"),
    body("initialQuantity")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("initialQuantity must be 0 or greater"),
    validate,
  ],
  createProduct,
);

router.get("/", getProducts);
router.get("/raw-materials", getRawMaterials);
router.get("/finished-products", getFinishedProducts);
router.get("/:id", getProductById);

router.put(
  "/:id",
  authorize(ROLES.MANAGER),
  [
    body("name").optional().notEmpty(),
    body("unitWeight").optional().isFloat({ min: 0.01 }),
    body("isActive").optional().isBoolean(),
    validate,
  ],
  updateProduct,
);

router.delete("/:id", authorize(ROLES.MANAGER), deleteProduct);

export default router;
