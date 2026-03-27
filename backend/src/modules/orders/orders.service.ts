import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { NotFoundError, BadRequestError } from "../../shared/errors/AppError";
import { generateOrderNumber } from "../../shared/utils/generators";
import { calculateDistance } from "../../shared/utils/distance";
import { TransportService } from "../transport/transport.service";

interface CreateOrderDTO {
  type: "RAW_MATERIAL_ORDER" | "FINISHED_PRODUCT_ORDER" | "DELIVERY";
  createdById: string;
  fromLocationId: string;
  toLocationId?: string;
  confirmingUserId: string;
  destinationUserId?: string;
  transportProviderId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

interface RateOrderDTO {
  onTime: boolean;
  damageFree: boolean;
}

type StockTable =
  | "rawMaterialStock"
  | "productionStock"
  | "finishedProductStock";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

export class OrderService {
  private transportService: TransportService;

  private readonly allowedStatusTransitions: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    PENDING: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["PREPARING", "CANCELLED"],
    PREPARING: ["IN_TRANSIT", "CANCELLED"],
    IN_TRANSIT: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
  };

  constructor() {
    this.transportService = new TransportService();
  }

  private normalizeRole(role?: string | null): string {
    return (role || "").toUpperCase();
  }

  private getRolesByLocationType(locationType: string): string[] {
    switch ((locationType || "").toUpperCase()) {
      case "RAW_WAREHOUSE":
        return ["RAW_STOCK_MANAGER", "MANAGER"];
      case "PRODUCTION_FACILITY":
        return ["PRODUCTION_CLIENT", "MANAGER"];
      case "FINISHED_WAREHOUSE":
        return ["FINISHED_STOCK_MANAGER", "MANAGER"];
      case "DISTRIBUTION_CENTER":
        return ["DISTRIBUTOR", "MANAGER"];
      default:
        return ["MANAGER"];
    }
  }

  private getAllowedConfirmingRoles(
    type: CreateOrderDTO["type"],
    fromLocationType: string,
  ): string[] {
    if (type === "RAW_MATERIAL_ORDER") {
      return ["RAW_STOCK_MANAGER", "MANAGER"];
    }

    if (type === "FINISHED_PRODUCT_ORDER") {
      return ["FINISHED_STOCK_MANAGER", "MANAGER"];
    }

    // DELIVERY
    return this.getRolesByLocationType(fromLocationType);
  }

  private getAllowedDestinationRolesForDelivery(
    toLocationType: string,
  ): string[] {
    return this.getRolesByLocationType(toLocationType);
  }

  private assertRoleAllowed(
    userRole: string | undefined | null,
    allowedRoles: string[],
    label: string,
  ) {
    const role = this.normalizeRole(userRole);
    if (!allowedRoles.includes(role)) {
      throw new BadRequestError(
        `${label} role is invalid. Allowed role(s): ${allowedRoles.join(", ")}`,
      );
    }
  }

  async createOrder(data: CreateOrderDTO) {
    const {
      type,
      createdById,
      fromLocationId,
      confirmingUserId,
      destinationUserId,
      transportProviderId,
      items,
    } = data;
    let { toLocationId } = data;

    const creatorUser = await prisma.user.findUnique({
      where: { id: createdById },
      select: { id: true, role: true, locationId: true, isActive: true },
    });

    if (!creatorUser || !creatorUser.isActive) {
      throw new NotFoundError("Creator user not found");
    }

    if (
      type === "RAW_MATERIAL_ORDER" &&
      creatorUser.role !== "PRODUCTION_CLIENT"
    ) {
      throw new BadRequestError(
        "Only production clients can create raw material orders",
      );
    }

    if (
      type === "FINISHED_PRODUCT_ORDER" &&
      creatorUser.role !== "DISTRIBUTOR"
    ) {
      throw new BadRequestError(
        "Only distributors can create finished product orders",
      );
    }

    if (
      type === "DELIVERY" &&
      creatorUser.role !== "PRODUCTION_CLIENT" &&
      creatorUser.role !== "FINISHED_STOCK_MANAGER"
    ) {
      throw new BadRequestError(
        "Only production clients or finished stock managers can create deliveries",
      );
    }

    if (type === "DELIVERY") {
      if (!toLocationId) {
        throw new BadRequestError("To location is required for delivery");
      }
      if (!destinationUserId) {
        throw new BadRequestError("Destination user is required for delivery");
      }
    } else {
      if (!creatorUser.locationId) {
        throw new BadRequestError("User has no assigned location");
      }
      toLocationId = creatorUser.locationId;
    }

    const [fromLocation, toLocation, confirmingUser] = await Promise.all([
      prisma.location.findUnique({ where: { id: fromLocationId } }),
      prisma.location.findUnique({ where: { id: toLocationId } }),
      prisma.user.findUnique({
        where: { id: confirmingUserId },
        select: { id: true, role: true, locationId: true, isActive: true },
      }),
    ]);

    if (!fromLocation || !toLocation) {
      throw new NotFoundError("One or both locations not found");
    }

    // For deliveries, confirming user should be at destination (toLocation)
    // For orders, confirming user should be at origin (fromLocation)
    const confirmedLocationId = type === "DELIVERY" ? toLocationId : fromLocationId;
    const confirmedLocationType = type === "DELIVERY" ? toLocation.locationType : fromLocation.locationType;
    const locationReferenceText = type === "DELIVERY" ? "the to location" : "the from location";

    if (
      !confirmingUser ||
      !confirmingUser.isActive ||
      confirmingUser.locationId !== confirmedLocationId
    ) {
      throw new BadRequestError(
        `Confirming user must be active and located at ${locationReferenceText}`,
      );
    }

    // Enforce confirming user role for both ORDER and DELIVERY
    const allowedConfirmingRoles = this.getAllowedConfirmingRoles(
      type,
      confirmedLocationType,
    );
    this.assertRoleAllowed(
      confirmingUser.role,
      allowedConfirmingRoles,
      "Confirming user",
    );

    if (type === "DELIVERY") {
      if (
        !creatorUser.locationId ||
        creatorUser.locationId !== fromLocationId
      ) {
        throw new BadRequestError("Delivery source must be your own location");
      }

      if (creatorUser.role === "PRODUCTION_CLIENT") {
        if (fromLocation.locationType !== "PRODUCTION_FACILITY") {
          throw new BadRequestError(
            "Production client deliveries must start from production facility",
          );
        }
        if (toLocation.locationType !== "FINISHED_WAREHOUSE") {
          throw new BadRequestError(
            "Production client deliveries must go to a finished warehouse",
          );
        }
      }

      if (creatorUser.role === "FINISHED_STOCK_MANAGER") {
        if (fromLocation.locationType !== "FINISHED_WAREHOUSE") {
          throw new BadRequestError(
            "Finished stock manager deliveries must start from finished warehouse",
          );
        }
        if (toLocation.locationType !== "DISTRIBUTION_CENTER") {
          throw new BadRequestError(
            "Finished stock manager deliveries must go to a distribution center",
          );
        }
      }

      const destinationUser = await prisma.user.findUnique({
        where: { id: destinationUserId! },
        select: { id: true, role: true, locationId: true, isActive: true },
      });

      if (!destinationUser || !destinationUser.isActive) {
        throw new BadRequestError("Destination user not found or inactive");
      }

      if (destinationUser.locationId !== toLocation.id) {
        throw new BadRequestError(
          "Destination user must belong to the destination location",
        );
      }

      // Enforce destination role for delivery
      const allowedDestinationRoles =
        this.getAllowedDestinationRolesForDelivery(toLocation.locationType);
      this.assertRoleAllowed(
        destinationUser.role,
        allowedDestinationRoles,
        "Destination user",
      );
    }

    const distanceKm = calculateDistance(
      fromLocation.latitude,
      fromLocation.longitude,
      toLocation.latitude,
      toLocation.longitude,
    );

    if (distanceKm <= 0) {
      throw new BadRequestError("Distance must be greater than 0");
    }

    const order = await prisma.$transaction(async (tx) => {
      let totalWeight = 0;

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product ${item.productId} not found`);
        }

        if (!product.isActive) {
          throw new BadRequestError(`Product ${product.name} is not active`);
        }

        if (type === "RAW_MATERIAL_ORDER" && product.type !== "RAW_MATERIAL") {
          throw new BadRequestError(
            `Product ${product.name} is not a raw material`,
          );
        }

        if (
          (type === "FINISHED_PRODUCT_ORDER" || type === "DELIVERY") &&
          product.type !== "FINISHED_PRODUCT"
        ) {
          throw new BadRequestError(
            `Product ${product.name} is not a finished product`,
          );
        }

        totalWeight += product.unitWeight * item.quantity;
      }

      const transportCostData =
        await this.transportService.calculateTransportCost(
          transportProviderId,
          totalWeight,
          distanceKm,
        );

      const transportTotal = transportCostData.totalCost;

      const sourceStockTable = this.getSourceStockTable(
        type,
        fromLocation.locationType,
      );
      await this.checkAndReserveStock(
        tx,
        sourceStockTable,
        fromLocationId,
        items,
      );

      const orderNumber = generateOrderNumber();

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          type,
          createdById,
          confirmingUserId,
          destinationUserId: type === "DELIVERY" ? destinationUserId : null,
          fromLocationId,
          toLocationId: toLocationId!,
          transportTotal,
          distanceKm: Math.round(distanceKm * 100) / 100,
          status: "PENDING",
        },
      });

      await tx.orderItem.createMany({
        data: items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      const transportJob = await tx.transportJob.create({
        data: {
          orderId: createdOrder.id,
          providerId: transportProviderId,
          fromLocationId,
          toLocationId: toLocationId!,
          distanceKm: Math.round(distanceKm * 100) / 100,
          totalWeight,
          totalCost: transportTotal,
          status: "SCHEDULED",
          scheduledDate: new Date(),
        },
      });

      await tx.vehicleAllocation.createMany({
        data: transportCostData.allocations.map((allocation) => ({
          jobId: transportJob.id,
          vehicleId: allocation.vehicleId,
          cost: allocation.cost,
        })),
      });

      for (const allocation of transportCostData.allocations) {
        await tx.vehicle.update({
          where: { id: allocation.vehicleId },
          data: { status: "IN_USE" },
        });
      }

      return createdOrder;
    });

    return this.getOrderById(order.id);
  }

  private isOrderStatus(value: string): value is OrderStatus {
    return ORDER_STATUSES.includes(value as OrderStatus);
  }

  private assertValidStatusTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ) {
    if (currentStatus === nextStatus) {
      throw new BadRequestError(`Order is already in status ${currentStatus}`);
    }

    const allowedNextStatuses = this.allowedStatusTransitions[currentStatus];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestError(
        `Invalid status transition: ${currentStatus} -> ${nextStatus}`,
      );
    }
  }

  private getSourceStockTable(
    orderType: CreateOrderDTO["type"],
    fromLocationType: string,
  ): StockTable {
    if (orderType === "RAW_MATERIAL_ORDER") return "rawMaterialStock";
    if (orderType === "FINISHED_PRODUCT_ORDER") return "finishedProductStock";

    if (fromLocationType === "PRODUCTION_FACILITY") return "productionStock";
    return "finishedProductStock";
  }

  private getDestinationStockTable(orderType: string): StockTable {
    if (orderType === "RAW_MATERIAL_ORDER") return "productionStock";
    return "finishedProductStock";
  }

  private async checkAndReserveStock(
    tx: Prisma.TransactionClient,
    stockTable: StockTable,
    fromLocationId: string,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    for (const item of items) {
      const stock = await (tx[stockTable] as any).findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: fromLocationId,
          },
        },
      });

      if (!stock) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        throw new BadRequestError(
          `Product ${product?.name} not available at this location`,
        );
      }

      const availableQty = stock.quantity - stock.reservedQty;

      if (availableQty < item.quantity) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        throw new BadRequestError(
          `Insufficient stock for ${product?.name}. Available: ${availableQty}, Requested: ${item.quantity}`,
        );
      }

      await (tx[stockTable] as any).update({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: fromLocationId,
          },
        },
        data: {
          reservedQty: stock.reservedQty + item.quantity,
          availableQty: availableQty - item.quantity,
        },
      });
    }
  }

  async getOrders(userId?: string, status?: string, type?: string) {
    const where: any = {};

    if (userId) {
      where.OR = [
        { createdById: userId },
        { confirmingUserId: userId },
        { destinationUserId: userId },
      ];
    }

    if (status) where.status = status;
    if (type) where.type = type;

    const orders = await prisma.order.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        confirmingUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            locationId: true,
          },
        },
        destinationUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            locationId: true,
          },
        },
        ratedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true,
          },
        },
        transportJob: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            allocations: {
              include: {
                vehicle: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      ...order,
      transportProvider: order.transportJob?.provider
        ? {
            id: order.transportJob.provider.id,
            name: order.transportJob.provider.name,
            email: order.transportJob.provider.user?.email || null,
            phone: null,
            companyName: order.transportJob.provider.name,
            userId: order.transportJob.provider.userId,
          }
        : null,
    }));
  }

  async getOrderById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        confirmingUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            locationId: true,
          },
        },
        destinationUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            locationId: true,
          },
        },
        ratedByUser: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true,
          },
        },
        transportJob: {
          include: {
            provider: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            fromLocation: true,
            toLocation: true,
            allocations: {
              include: {
                vehicle: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    return {
      ...order,
      transportProvider: order.transportJob?.provider
        ? {
            id: order.transportJob.provider.id,
            name: order.transportJob.provider.name,
            email: order.transportJob.provider.user?.email || null,
            phone: null,
            companyName: order.transportJob.provider.name,
            userId: order.transportJob.provider.userId,
          }
        : null,
    };
  }

  async updateOrderStatus(id: string, status: string) {
    if (!this.isOrderStatus(status)) {
      throw new BadRequestError(`Invalid order status: ${status}`);
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        fromLocation: true,
        items: true,
        transportJob: {
          include: {
            allocations: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    const currentStatus = order.status as OrderStatus;
    const nextStatus = status as OrderStatus;

    if (!this.isOrderStatus(currentStatus)) {
      throw new BadRequestError(
        `Unknown current order status: ${order.status}`,
      );
    }

    this.assertValidStatusTransition(currentStatus, nextStatus);

    await prisma.$transaction(async (tx) => {
      const data: any = { status: nextStatus };

      if (nextStatus === "DELIVERED") {
        data.deliveryDate = new Date();

        await this.releaseAndDeductStock(
          tx,
          order.type,
          order.fromLocation.locationType,
          order.fromLocationId,
          order.toLocationId,
          order.items,
        );

        if (order.transportJob) {
          for (const allocation of order.transportJob.allocations) {
            await tx.vehicle.update({
              where: { id: allocation.vehicleId },
              data: { status: "AVAILABLE" },
            });
          }

          await tx.transportJob.update({
            where: { id: order.transportJob.id },
            data: {
              status: "COMPLETED",
              completedDate: new Date(),
            },
          });
        }
      }

      if (nextStatus === "CANCELLED") {
        await this.releaseReservedStock(
          tx,
          order.type,
          order.fromLocation.locationType,
          order.fromLocationId,
          order.items,
        );

        if (order.transportJob) {
          for (const allocation of order.transportJob.allocations) {
            await tx.vehicle.update({
              where: { id: allocation.vehicleId },
              data: { status: "AVAILABLE" },
            });
          }

          await tx.transportJob.update({
            where: { id: order.transportJob.id },
            data: { status: "CANCELLED" },
          });
        }
      }

      if (nextStatus === "IN_TRANSIT" && order.transportJob) {
        await tx.transportJob.update({
          where: { id: order.transportJob.id },
          data: { status: "IN_PROGRESS" },
        });
      }

      await tx.order.update({
        where: { id },
        data,
      });
    });

    return this.getOrderById(id);
  }

  private async releaseAndDeductStock(
    tx: Prisma.TransactionClient,
    orderType: string,
    fromLocationType: string,
    fromLocationId: string,
    toLocationId: string,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    const sourceStockTable = this.getSourceStockTable(
      orderType as "RAW_MATERIAL_ORDER" | "FINISHED_PRODUCT_ORDER" | "DELIVERY",
      fromLocationType,
    );
    const destStockTable = this.getDestinationStockTable(orderType);

    for (const item of items) {
      const sourceStock = await (tx[sourceStockTable] as any).findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: fromLocationId,
          },
        },
      });

      if (!sourceStock) {
        throw new BadRequestError("Source stock record not found");
      }

      const newQuantity = sourceStock.quantity - item.quantity;
      const newReservedQty = sourceStock.reservedQty - item.quantity;

      await (tx[sourceStockTable] as any).update({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: fromLocationId,
          },
        },
        data: {
          quantity: newQuantity,
          reservedQty: newReservedQty,
          availableQty: newQuantity - newReservedQty,
        },
      });

      const destStock = await (tx[destStockTable] as any).findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: toLocationId,
          },
        },
      });

      if (!destStock) {
        await (tx[destStockTable] as any).create({
          data: {
            productId: item.productId,
            locationId: toLocationId,
            quantity: item.quantity,
            reservedQty: 0,
            availableQty: item.quantity,
          },
        });
      } else {
        const newDestQty = destStock.quantity + item.quantity;
        await (tx[destStockTable] as any).update({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: toLocationId,
            },
          },
          data: {
            quantity: newDestQty,
            availableQty: newDestQty - destStock.reservedQty,
          },
        });
      }
    }
  }

  private async releaseReservedStock(
    tx: Prisma.TransactionClient,
    orderType: string,
    fromLocationType: string,
    fromLocationId: string,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    const stockTable = this.getSourceStockTable(
      orderType as "RAW_MATERIAL_ORDER" | "FINISHED_PRODUCT_ORDER" | "DELIVERY",
      fromLocationType,
    );

    for (const item of items) {
      const stock = await (tx[stockTable] as any).findUnique({
        where: {
          productId_locationId: {
            productId: item.productId,
            locationId: fromLocationId,
          },
        },
      });

      if (stock) {
        const newReservedQty = stock.reservedQty - item.quantity;
        await (tx[stockTable] as any).update({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: fromLocationId,
            },
          },
          data: {
            reservedQty: newReservedQty,
            availableQty: stock.quantity - newReservedQty,
          },
        });
      }
    }
  }

  async rateOrder(orderId: string, userId: string, data: RateOrderDTO) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        type: true,
        status: true,
        createdById: true,
        destinationUserId: true,
        ratedAt: true,
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status !== "DELIVERED") {
      throw new BadRequestError("Only delivered orders can be rated");
    }

    if (order.ratedAt) {
      throw new BadRequestError("Order has already been rated");
    }

    if (order.type === "DELIVERY") {
      if (!order.destinationUserId || order.destinationUserId !== userId) {
        throw new BadRequestError(
          "Only destination user can rate this delivery",
        );
      }
    } else if (order.createdById !== userId) {
      throw new BadRequestError("Only order creator can rate this order");
    }

    await prisma.order.update({
      where: { id: orderId },
      data: {
        ratingOnTime: data.onTime,
        ratingDamageFree: data.damageFree,
        ratedAt: new Date(),
        ratedByUserId: userId,
      },
    });

    return this.getOrderById(orderId);
  }

  async cancelOrder(id: string) {
    return this.updateOrderStatus(id, "CANCELLED");
  }

  async getMyOrderNotifications(userId: string) {
    const orders = await prisma.order.findMany({
      where: {
        confirmingUserId: userId,
        status: "PENDING",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true,
          },
        },
        transportJob: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      type: order.type,
      status: order.status,
      createdAt: order.createdAt,
      createdBy: order.createdBy,
      fromLocation: order.fromLocation,
      toLocation: order.toLocation,
      items: order.items,
      transportProvider: order.transportJob?.provider
        ? {
            id: order.transportJob.provider.id,
            name: order.transportJob.provider.name,
            userId: order.transportJob.provider.userId,
          }
        : null,
      message: `New ${order.type === "DELIVERY" ? "delivery" : "order"} assigned to you for confirmation`,
    }));
  }

  async acceptAssignedOrder(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        confirmingUserId: true,
      },
    });

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.confirmingUserId !== userId) {
      throw new BadRequestError(
        "You are not the assigned confirming user for this order",
      );
    }

    if (order.status !== "PENDING") {
      throw new BadRequestError("Only pending orders can be accepted");
    }

    return this.updateOrderStatus(orderId, "CONFIRMED");
  }
}
