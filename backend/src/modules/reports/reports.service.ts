import prisma from "../../config/prisma";

export class ReportService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats() {
    const [orderStats, stockStats, transportStats] = await Promise.all([
      this.getOrderStats(),
      this.getStockStats(),
      this.getTransportStats(),
    ]);

    return {
      orders: orderStats,
      stock: stockStats,
      transport: transportStats,
    };
  }

  private async getOrderStats() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const previousMonthEnd = new Date(currentMonthStart);

    const [
      total,
      byStatus,
      byType,
      currentMonthCost,
      previousMonthCost,
      currentMonthCount,
      previousMonthCount,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.order.groupBy({
        by: ["type"],
        _count: true,
      }),
      // Current month cost (from 1st of current month to today)
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: currentMonthStart,
            lt: now,
          },
        },
        _sum: {
          transportTotal: true,
        },
      }),
      // Previous month cost (from 1st of previous month to last day of previous month)
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: previousMonthStart,
            lt: previousMonthEnd,
          },
        },
        _sum: {
          transportTotal: true,
        },
      }),
      // Current month order count
      prisma.order.count({
        where: {
          createdAt: {
            gte: currentMonthStart,
            lt: now,
          },
        },
      }),
      // Previous month order count
      prisma.order.count({
        where: {
          createdAt: {
            gte: previousMonthStart,
            lt: previousMonthEnd,
          },
        },
      }),
    ]);

    const currentCost = currentMonthCost._sum.transportTotal || 0;
    const previousCost = previousMonthCost._sum.transportTotal || 0;
    const costPercentageChange =
      previousCost === 0
        ? currentCost > 0
          ? 100
          : 0
        : ((currentCost - previousCost) / previousCost) * 100;

    const orderPercentageChange =
      previousMonthCount === 0
        ? currentMonthCount > 0
          ? 100
          : 0
        : ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100;

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
      costLastMonth: currentCost,
      costComparison: {
        current: currentCost,
        previous: previousCost,
        percentageChange: Math.round(costPercentageChange * 10) / 10, // Round to 1 decimal
      },
      orderComparison: {
        current: currentMonthCount,
        previous: previousMonthCount,
        percentageChange: Math.round(orderPercentageChange * 10) / 10, // Round to 1 decimal
      },
    };
  }

  private async getStockStats() {
    const [rawMaterial, production, finishedProduct] = await Promise.all([
      prisma.rawMaterialStock.aggregate({
        _sum: {
          quantity: true,
          reservedQty: true,
        },
        _count: true,
      }),
      prisma.productionStock.aggregate({
        _sum: {
          quantity: true,
          reservedQty: true,
        },
        _count: true,
      }),
      prisma.finishedProductStock.aggregate({
        _sum: {
          quantity: true,
          reservedQty: true,
        },
        _count: true,
      }),
    ]);

    return {
      rawMaterial: {
        total: rawMaterial._sum.quantity || 0,
        reserved: rawMaterial._sum.reservedQty || 0,
        available:
          (rawMaterial._sum.quantity || 0) -
          (rawMaterial._sum.reservedQty || 0),
        items: rawMaterial._count,
      },
      production: {
        total: production._sum.quantity || 0,
        reserved: production._sum.reservedQty || 0,
        available:
          (production._sum.quantity || 0) - (production._sum.reservedQty || 0),
        items: production._count,
      },
      finishedProduct: {
        total: finishedProduct._sum.quantity || 0,
        reserved: finishedProduct._sum.reservedQty || 0,
        available:
          (finishedProduct._sum.quantity || 0) -
          (finishedProduct._sum.reservedQty || 0),
        items: finishedProduct._count,
      },
    };
  }

  private async getTransportStats() {
    const [totalJobs, byStatus, totalVehicles, availableVehicles] =
      await Promise.all([
        prisma.transportJob.count(),
        prisma.transportJob.groupBy({
          by: ["status"],
          _count: true,
        }),
        prisma.vehicle.count(),
        prisma.vehicle.count({
          where: { status: "AVAILABLE" },
        }),
      ]);

    return {
      totalJobs,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      totalVehicles,
      availableVehicles,
    };
  }

  /**
   * Get order analytics
   */
  async getOrderAnalytics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [orders, totals] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          type: true,
          status: true,
          transportTotal: true,
          createdAt: true,
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.aggregate({
        where,
        _sum: {
          transportTotal: true,
        },
        _avg: {
          transportTotal: true,
        },
        _count: true,
      }),
    ]);

    return {
      orders,
      summary: {
        totalOrders: totals._count,
        totalTransportCost: totals._sum.transportTotal || 0,
        totalCost: totals._sum.transportTotal || 0,
        averageOrderValue: totals._avg.transportTotal || 0,
      },
    };
  }

  /**
   * Get stock movement report
   */
  async getStockMovementReport(locationId?: string) {
    const where: any = {};
    if (locationId) {
      where.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }];
    }

    const orders = await prisma.order.findMany({
      where: {
        ...where,
        status: "DELIVERED",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        fromLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        toLocation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { deliveryDate: "desc" },
      take: 100,
    });

    return orders;
  }

  async getTransportJobAnalytics(
    startDate?: Date,
    endDate?: Date,
    providerId?: string,
  ) {
    const orderWhere: any = {
      transportJob: { isNot: null }, // Only orders with transport jobs
    };

    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) orderWhere.createdAt.gte = startDate;
      if (endDate) orderWhere.createdAt.lte = endDate;
    }

    let orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        confirmingUser: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        transportJob: {
          include: {
            provider: {
              select: { id: true, name: true, userId: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by provider ID in memory if specified
    if (providerId) {
      orders = orders.filter((o) => o.transportJob?.provider?.id === providerId);
    }

    const totalJobs = orders.length;
    const totalCost = orders.reduce(
      (sum, o) => sum + Number(o.transportTotal || 0),
      0,
    );

    const rated = orders.filter((o) => o.ratedAt);
    const ratedCount = rated.length;
    const onTimeTrue = rated.filter((o) => o.ratingOnTime === true).length;
    const damageFreeTrue = rated.filter(
      (o) => o.ratingDamageFree === true,
    ).length;

    const onTimePercentage =
      ratedCount === 0 ? 0 : (onTimeTrue / ratedCount) * 100;
    const damageFreePercentage =
      ratedCount === 0 ? 0 : (damageFreeTrue / ratedCount) * 100;

    return {
      summary: {
        totalJobs,
        ratedJobs: ratedCount,
        totalCost,
        onTimePercentage: Math.round(onTimePercentage * 10) / 10,
        damageFreePercentage: Math.round(damageFreePercentage * 10) / 10,
      },
      records: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        status: o.status,
        transportTotal: o.transportTotal,
        createdAt: o.createdAt,
        deliveryDate: o.deliveryDate,
        ratingOnTime: o.ratingOnTime,
        ratingDamageFree: o.ratingDamageFree,
        ratedAt: o.ratedAt,
        provider: o.transportJob?.provider || null,
        createdBy: o.createdBy,
        confirmingUser: o.confirmingUser || null,
      })),
    };
  }
}
