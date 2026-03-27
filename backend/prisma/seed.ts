import prisma from "../src/config/prisma";
import bcrypt from "bcrypt";

async function main() {
  console.log("Starting database seed...");

  console.log("Creating users...");

  const managerPassword = await bcrypt.hash("securePassword123", 10);
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      password: managerPassword,
      firstName: "System",
      lastName: "Manager",
      role: "MANAGER",
      isActive: true,
    },
  });

  // Create locations first so we can assign users to them
  console.log("Creating locations...");

  const rawWarehouse = await prisma.location.upsert({
    where: { id: "raw-warehouse-1" },
    update: {},
    create: {
      id: "raw-warehouse-1",
      name: "Main Raw Materials Warehouse",
      address: "123 Warehouse St, Industrial Zone",
      latitude: 40.7128,
      longitude: -74.006,
      locationType: "RAW_WAREHOUSE",
    },
  });

  const productionFacility = await prisma.location.upsert({
    where: { id: "production-facility-1" },
    update: {},
    create: {
      id: "production-facility-1",
      name: "Main Production Facility",
      address: "456 Factory Rd, Industrial Park",
      latitude: 40.7589,
      longitude: -73.9851,
      locationType: "PRODUCTION_FACILITY",
    },
  });

  const finishedWarehouse = await prisma.location.upsert({
    where: { id: "finished-warehouse-1" },
    update: {},
    create: {
      id: "finished-warehouse-1",
      name: "Main Finished Products Warehouse",
      address: "321 Finished Goods Blvd, Logistics Zone",
      latitude: 40.7412,
      longitude: -73.9896,
      locationType: "FINISHED_WAREHOUSE",
    },
  });

  const distributionCenter = await prisma.location.upsert({
    where: { id: "distribution-center-1" },
    update: {},
    create: {
      id: "distribution-center-1",
      name: "Central Distribution Center",
      address: "789 Distribution Ave, Commerce District",
      latitude: 40.7306,
      longitude: -73.9352,
      locationType: "DISTRIBUTION_CENTER",
    },
  });

  console.log("✅ Locations created");

  // Now create users with assigned locations
  const rawStockPassword = await bcrypt.hash("securePassword123", 10);
  const rawStockManager = await prisma.user.upsert({
    where: { email: "stockmanager@example.com" },
    update: { locationId: rawWarehouse.id },
    create: {
      email: "stockmanager@example.com",
      password: rawStockPassword,
      firstName: "Raw Stock",
      lastName: "Manager",
      role: "RAW_STOCK_MANAGER",
      locationId: rawWarehouse.id,
      isActive: true,
    },
  });

  const productionPassword = await bcrypt.hash("securePassword123", 10);
  const productionClient = await prisma.user.upsert({
    where: { email: "production@example.com" },
    update: { locationId: productionFacility.id },
    create: {
      email: "production@example.com",
      password: productionPassword,
      firstName: "Production",
      lastName: "Client",
      role: "PRODUCTION_CLIENT",
      locationId: productionFacility.id,
      isActive: true,
    },
  });

  const finishedStockPassword = await bcrypt.hash("securePassword123", 10);
  const finishedStockManager = await prisma.user.upsert({
    where: { email: "finishedstock@example.com" },
    update: { locationId: finishedWarehouse.id },
    create: {
      email: "finishedstock@example.com",
      password: finishedStockPassword,
      firstName: "Finished Stock",
      lastName: "Manager",
      role: "FINISHED_STOCK_MANAGER",
      locationId: finishedWarehouse.id,
      isActive: true,
    },
  });

  const distributorPassword = await bcrypt.hash("securePassword123", 10);
  const distributor = await prisma.user.upsert({
    where: { email: "distributor@example.com" },
    update: { locationId: distributionCenter.id },
    create: {
      email: "distributor@example.com",
      password: distributorPassword,
      firstName: "Main",
      lastName: "Distributor",
      role: "DISTRIBUTOR",
      locationId: distributionCenter.id,
      isActive: true,
    },
  });

  const transportPassword = await bcrypt.hash("securePassword123", 10);
  const transportUser = await prisma.user.upsert({
    where: { email: "transport@example.com" },
    update: {},
    create: {
      email: "transport@example.com",
      password: transportPassword,
      firstName: "Fast",
      lastName: "Transport",
      role: "TRANSPORT_PROVIDER",
      isActive: true,
    },
  });

  console.log("✅ Users created");

  console.log("Creating products...");

  const steelRod = await prisma.product.upsert({
    where: { sku: "RAW-STEEL-001" },
    update: {},
    create: {
      name: "Steel Rod",
      description: "High-grade steel rod for manufacturing",
      sku: "RAW-STEEL-001",
      type: "RAW_MATERIAL",
      unitWeight: 5.0,
      isActive: true,
    },
  });

  const plasticPellets = await prisma.product.upsert({
    where: { sku: "RAW-PLASTIC-001" },
    update: {},
    create: {
      name: "Plastic Pellets",
      description: "Recyclable plastic pellets",
      sku: "RAW-PLASTIC-001",
      type: "RAW_MATERIAL",
      unitWeight: 1.0,
      isActive: true,
    },
  });

  const finishedWidget = await prisma.product.upsert({
    where: { sku: "FIN-WIDGET-001" },
    update: {},
    create: {
      name: "Industrial Widget",
      description: "High-quality industrial widget",
      sku: "FIN-WIDGET-001",
      type: "FINISHED_PRODUCT",
      unitWeight: 3.0,
      isActive: true,
    },
  });

  const finishedGadget = await prisma.product.upsert({
    where: { sku: "FIN-GADGET-001" },
    update: {},
    create: {
      name: "Consumer Gadget",
      description: "Popular consumer gadget",
      sku: "FIN-GADGET-001",
      type: "FINISHED_PRODUCT",
      unitWeight: 0.5,
      isActive: true,
    },
  });

  console.log("✅ Products created");

  console.log("Creating initial stock for all products...");

  // Get all existing products from database
  const allProducts = await prisma.product.findMany({
    where: { isActive: true },
  });

  // Get all locations by type
  const rawWarehouses = await prisma.location.findMany({
    where: { locationType: "RAW_WAREHOUSE" },
  });

  const productionFacilities = await prisma.location.findMany({
    where: { locationType: "PRODUCTION_FACILITY" },
  });

  const finishedWarehouses = await prisma.location.findMany({
    where: { locationType: "FINISHED_WAREHOUSE" },
  });

  const distributionCenters = await prisma.location.findMany({
    where: { locationType: "DISTRIBUTION_CENTER" },
  });

  // Populate stock for all products
  for (const product of allProducts) {
    if (product.type === "RAW_MATERIAL") {
      // Raw materials should have stock at raw warehouses and production facilities
      for (const warehouse of rawWarehouses) {
        await prisma.rawMaterialStock.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: warehouse.id,
            },
          },
          update: {},
          create: {
            productId: product.id,
            locationId: warehouse.id,
            quantity: 1000,
            reservedQty: 0,
            availableQty: 1000,
          },
        });
      }

      for (const facility of productionFacilities) {
        await prisma.productionStock.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: facility.id,
            },
          },
          update: {},
          create: {
            productId: product.id,
            locationId: facility.id,
            quantity: 500,
            reservedQty: 0,
            availableQty: 500,
          },
        });
      }
    } else if (product.type === "FINISHED_PRODUCT") {
      // Finished products should have stock at production facilities, finished warehouses, and distribution centers
      for (const facility of productionFacilities) {
        await prisma.productionStock.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: facility.id,
            },
          },
          update: {},
          create: {
            productId: product.id,
            locationId: facility.id,
            quantity: 300,
            reservedQty: 0,
            availableQty: 300,
          },
        });
      }

      for (const warehouse of finishedWarehouses) {
        await prisma.finishedProductStock.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: warehouse.id,
            },
          },
          update: {},
          create: {
            productId: product.id,
            locationId: warehouse.id,
            quantity: 1200,
            reservedQty: 0,
            availableQty: 1200,
          },
        });
      }

      for (const center of distributionCenters) {
        await prisma.finishedProductStock.upsert({
          where: {
            productId_locationId: {
              productId: product.id,
              locationId: center.id,
            },
          },
          update: {},
          create: {
            productId: product.id,
            locationId: center.id,
            quantity: 2000,
            reservedQty: 0,
            availableQty: 2000,
          },
        });
      }
    }
  }

  console.log(
    `✅ Stock created for ${allProducts.length} products across all locations`,
  );

  console.log("Creating transport provider...");

  const transportProvider = await prisma.transportProvider.upsert({
    where: { userId: transportUser.id },
    update: {},
    create: {
      name: "Fast Transport Co.",
      userId: transportUser.id,
      isActive: true,
    },
  });

  await prisma.vehicle.upsert({
    where: { licensePlate: "TRUCK-001" },
    update: {},
    create: {
      providerId: transportProvider.id,
      name: "Heavy Truck 1",
      licensePlate: "TRUCK-001",
      capacityKg: 5000,
      costPerKm: 2.5,
      status: "AVAILABLE",
    },
  });

  await prisma.vehicle.upsert({
    where: { licensePlate: "VAN-001" },
    update: {},
    create: {
      providerId: transportProvider.id,
      name: "Delivery Van 1",
      licensePlate: "VAN-001",
      capacityKg: 1000,
      costPerKm: 1.0,
      status: "AVAILABLE",
    },
  });

  console.log("✅ Transport provider and vehicles created");

  console.log("\n=".repeat(50));
  console.log("✅ Database seeded successfully!");
  console.log("=".repeat(50));
  console.log("\nTest Accounts:");
  console.log("Manager: manager@example.com / securePassword123");
  console.log("  Role: MANAGER (Full access, no location assigned)");
  console.log(
    "\nRaw Stock Manager: stockmanager@example.com / securePassword123",
  );
  console.log("  Role: RAW_STOCK_MANAGER");
  console.log("  Location: Main Raw Materials Warehouse");
  console.log(
    "\nProduction Client: production@example.com / securePassword123",
  );
  console.log("  Role: PRODUCTION_CLIENT");
  console.log("  Location: Main Production Facility");
  console.log(
    "\nFinished Stock Manager: finishedstock@example.com / securePassword123",
  );
  console.log("  Role: FINISHED_STOCK_MANAGER");
  console.log("  Location: Main Finished Products Warehouse");
  console.log("\nDistributor: distributor@example.com / securePassword123");
  console.log("  Role: DISTRIBUTOR");
  console.log("  Location: Central Distribution Center");
  console.log(
    "\nTransport Provider: transport@example.com / securePassword123",
  );
  console.log("  Role: TRANSPORT_PROVIDER");
  console.log("=".repeat(50));
  console.log("\nLocations Created:");
  console.log("1. Main Raw Materials Warehouse (RAW_WAREHOUSE)");
  console.log("2. Main Production Facility (PRODUCTION_FACILITY)");
  console.log("3. Main Finished Products Warehouse (FINISHED_WAREHOUSE)");
  console.log("4. Central Distribution Center (DISTRIBUTION_CENTER)");
  console.log("=".repeat(50));
  console.log("\nTransport Resources:");
  console.log("✅ Transport Provider: Fast Transport Co.");
  console.log("✅ Vehicle 1: Heavy Truck 1 (TRUCK-001) - 5000kg capacity");
  console.log("✅ Vehicle 2: Delivery Van 1 (VAN-001) - 1000kg capacity");
  console.log("=".repeat(50));
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
