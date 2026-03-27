import prisma from "../../config/prisma";
import { NotFoundError, ConflictError } from "../../shared/errors/AppError";
import {
  getPaginationParams,
  getPaginationMeta,
} from "../../shared/utils/pagination";

interface CreateProductDTO {
  name: string;
  description?: string;
  sku: string;
  type: "RAW_MATERIAL" | "FINISHED_PRODUCT";
  unitWeight: number;
  initialLocationId?: string;
  initialQuantity?: number;
}

interface UpdateProductDTO {
  name?: string;
  description?: string;
  unitWeight?: number;
  isActive?: boolean;
}

export class ProductService {
  async createProduct(data: CreateProductDTO) {
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingProduct) {
      throw new ConflictError("Product with this SKU already exists");
    }

    const { initialLocationId, initialQuantity = 0, ...productData } = data;
    const qty = Number(initialQuantity || 0);

    const requiredLocationType =
      productData.type === "RAW_MATERIAL"
        ? "RAW_WAREHOUSE"
        : "FINISHED_WAREHOUSE";

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: productData,
      });

      let targetLocation: any = null;

      if (initialLocationId) {
        targetLocation = await tx.location.findUnique({
          where: { id: initialLocationId },
        });

        if (!targetLocation) {
          throw new NotFoundError("Initial location not found");
        }

        if (targetLocation.locationType !== requiredLocationType) {
          throw new ConflictError(
            `Invalid location type for ${productData.type}. Expected ${requiredLocationType}`,
          );
        }
      } else {
        targetLocation = await tx.location.findFirst({
          where: { locationType: requiredLocationType },
          orderBy: { createdAt: "asc" },
        });

        if (!targetLocation) {
          throw new NotFoundError(
            `No ${requiredLocationType} location exists to assign initial stock`,
          );
        }
      }

      // IMPORTANT: use correct Prisma delegate by product type
      if (productData.type === "RAW_MATERIAL") {
        await tx.rawMaterialStock.upsert({
          where: {
            productId_locationId: {
              productId: createdProduct.id,
              locationId: targetLocation.id,
            },
          },
          update: {
            quantity: { increment: qty },
            availableQty: { increment: qty },
          },
          create: {
            productId: createdProduct.id,
            locationId: targetLocation.id,
            quantity: qty,
            reservedQty: 0,
            availableQty: qty,
          },
        });
      } else {
        await tx.finishedProductStock.upsert({
          where: {
            productId_locationId: {
              productId: createdProduct.id,
              locationId: targetLocation.id,
            },
          },
          update: {
            quantity: { increment: qty },
            availableQty: { increment: qty },
          },
          create: {
            productId: createdProduct.id,
            locationId: targetLocation.id,
            quantity: qty,
            reservedQty: 0,
            availableQty: qty,
          },
        });
      }

      return createdProduct;
    });

    return product;
  }

  async getProducts(page: number = 1, limit: number = 20, type?: string) {
    const { skip, take } = getPaginationParams(page, limit);

    const where: any = { isActive: true };
    if (type) where.type = type;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    const meta = getPaginationMeta(total, page, limit);
    return { products, meta };
  }

  async getProductById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");
    return product;
  }

  async updateProduct(id: string, data: UpdateProductDTO) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");

    return prisma.product.update({
      where: { id },
      data,
    });
  }

  async deleteProduct(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product not found");

    await prisma.product.delete({ where: { id } });
    return { message: "Product deleted successfully" };
  }

  async getRawMaterials(page: number = 1, limit: number = 20) {
    return this.getProducts(page, limit, "RAW_MATERIAL");
  }

  async getFinishedProducts(page: number = 1, limit: number = 20) {
    return this.getProducts(page, limit, "FINISHED_PRODUCT");
  }
}
