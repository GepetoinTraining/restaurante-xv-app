// PATH: prisma/seed.ts
import {
  PrismaClient,
  Role,
  WorkstationType,
  VenueObjectType,
  ProductType,
  PrepTaskStatus,
  DeliveryStatus,
  RouteStatus,
  PanStatus,
  POStatus,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Helper function to get a date in the future
const getFutureDate = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(0, 0, 0, 0); // Set to midnight
  return date;
};

async function main() {
  console.log("Start seeding ...");

  // 1. --- Clear old data in reverse dependency order ---
  console.log("Cleaning database...");
  await prisma.routeStop.deleteMany();
  await prisma.panShipment.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.route.deleteMany();
  await prisma.dailyMenuAssignment.deleteMany();
  await prisma.menuRecipeItem.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockHolding.deleteMany();
  await prisma.prepTask.deleteMany();
  await prisma.prepRecipeInput.deleteMany();
  await prisma.prepRecipe.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.product.deleteMany();
  await prisma.venueObject.deleteMany();
  await prisma.floorPlan.deleteMany();
  await prisma.workstation.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.companyClient.deleteMany();
  await prisma.servingPan.deleteMany();
  await prisma.servingPanModel.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  // 2. --- Core Setup (Users, Workstations, Locations, Vehicles) ---
  console.log("Seeding core setup...");

  const hashedPin = await bcrypt.hash("1234", 10);
  const owner = await prisma.user.create({
    data: {
      name: "Ana Proprietária",
      email: "owner@restaurante.com",
      pin: hashedPin,
      role: Role.OWNER,
    },
  });

  const cook = await prisma.user.create({
    data: {
      name: "Carlos Cozinheiro",
      email: "cook@restaurante.com",
      pin: hashedPin,
      role: Role.COOK,
    },
  });

  const driver = await prisma.user.create({
    data: {
      name: "Daniel Diretor",
      email: "driver@restaurante.com",
      pin: hashedPin,
      role: Role.DRIVER,
    },
  });

  const salesperson = await prisma.user.create({
    data: {
      name: "Vera Vendedora",
      email: "sales@restaurante.com",
      pin: hashedPin,
      role: Role.SALES,
    },
  });

  const supplierHortifruti = await prisma.supplier.create({
    data: { name: "Hortifruti Zé" },
  });
  const supplierCarnes = await prisma.supplier.create({
    data: { name: "Carnes do Sul" },
  });

  const wsPreparoQuente = await prisma.workstation.create({
    data: { name: "Preparo Quente", type: WorkstationType.PREP_STATION },
  });
  const wsPreparoFrio = await prisma.workstation.create({
    data: { name: "Preparo Frio (Saladas)", type: WorkstationType.PREP_STATION },
  });
  const wsEmbalagem = await prisma.workstation.create({
    data: { name: "Embalagem", type: WorkstationType.PACKING_STATION },
  });

  const fiorino = await prisma.vehicle.create({
    data: { model: "Fiat Fiorino", licensePlate: "ABC-1234" },
  });
  const moto = await prisma.vehicle.create({
    data: { model: "Honda CG 160", licensePlate: "XYZ-9876" },
  });

  const panModelGN1_1 = await prisma.servingPanModel.create({
    data: { name: "GN 1/1 (100mm)", tareWeightG: 1500, capacityL: 13.5 },
  });
  const panModelGN1_2 = await prisma.servingPanModel.create({
    data: { name: "GN 1/2 (100mm)", tareWeightG: 900, capacityL: 6.5 },
  });

  // Create a pool of pans
  for (let i = 1; i <= 10; i++) {
    await prisma.servingPan.create({
      data: {
        panModelId: panModelGN1_1.id,
        uniqueIdentifier: `GN11-${i.toString().padStart(3, "0")}`,
        status: PanStatus.AVAILABLE,
      },
    });
  }
  for (let i = 1; i <= 15; i++) {
    await prisma.servingPan.create({
      data: {
        panModelId: panModelGN1_2.id,
        uniqueIdentifier: `GN12-${i.toString().padStart(3, "0")}`,
        status: PanStatus.AVAILABLE,
      },
    });
  }

  // 3. --- Floor Plan & Venue Objects (Storage) ---
  console.log("Seeding floor plan and storage...");

  const floorPlanCozinha = await prisma.floorPlan.create({
    data: { name: "Cozinha Principal", width: 2000, height: 1500 },
  });

  const voEstoqueSeco = await prisma.venueObject.create({
    data: {
      name: "Estoque Seco",
      type: VenueObjectType.STORAGE,
      floorPlanId: floorPlanCozinha.id,
      anchorX: 50,
      anchorY: 50,
      width: 200,
      height: 150,
    },
  });

  const voFreezer = await prisma.venueObject.create({
    data: {
      name: "Freezer Principal",
      type: VenueObjectType.FREEZER,
      floorPlanId: floorPlanCozinha.id,
      anchorX: 50,
      anchorY: 250,
      width: 150,
      height: 150,
    },
  });

  const voBancadaQuente = await prisma.venueObject.create({
    data: {
      name: "Bancada Preparo Quente",
      type: VenueObjectType.WORKSTATION,
      floorPlanId: floorPlanCozinha.id,
      anchorX: 300,
      anchorY: 50,
      width: 250,
      height: 100,
      workstationId: wsPreparoQuente.id, // Link to workstation
    },
  });

  // 4. --- Ingredients (Raw) & Stock ---
  console.log("Seeding raw ingredients and stock...");

  const ingArroz = await prisma.ingredient.create({
    data: { name: "Arroz Agulhinha (Cru)", unit: "g", costPerUnit: 0.015 },
  });
  const ingFeijao = await prisma.ingredient.create({
    data: { name: "Feijão Preto (Cru)", unit: "g", costPerUnit: 0.02 },
  });
  const ingPeitoFrango = await prisma.ingredient.create({
    data: { name: "Peito de Frango (Cru)", unit: "g", costPerUnit: 0.035 },
  });
  const ingAlface = await prisma.ingredient.create({
    data: { name: "Alface Crespa", unit: "unidade", costPerUnit: 2.5 },
  });
  const ingTomate = await prisma.ingredient.create({
    data: { name: "Tomate Salada", unit: "g", costPerUnit: 0.01 },
  });
  const ingOleoSoja = await prisma.ingredient.create({
    data: { name: "Óleo de Soja", unit: "ml", costPerUnit: 0.012 },
  });
  const ingSal = await prisma.ingredient.create({
    data: { name: "Sal Refinado", unit: "g", costPerUnit: 0.002 },
  });

  // Add stock for raw ingredients
  await prisma.stockHolding.create({
    data: {
      ingredientId: ingArroz.id,
      venueObjectId: voEstoqueSeco.id, // Store in "Estoque Seco"
      quantity: 50000, // 50kg
      costAtAcquisition: 0.015,
    },
  });
  await prisma.stockHolding.create({
    data: {
      ingredientId: ingPeitoFrango.id,
      venueObjectId: voFreezer.id, // Store in "Freezer"
      quantity: 20000, // 20kg
      costAtAcquisition: 0.035,
    },
  });
  await prisma.stockHolding.create({
    data: {
      ingredientId: ingSal.id,
      venueObjectId: voEstoqueSeco.id,
      quantity: 5000, // 5kg
      costAtAcquisition: 0.002,
    },
  });

  // 5. --- Prepared Ingredients & Prep Recipes ---
  console.log("Seeding prep recipes...");

  // Output Ingredient for the prep recipe
  const ingFrangoGrelhado = await prisma.ingredient.create({
    data: {
      name: "Frango Grelhado (Pronto)",
      unit: "g",
      costPerUnit: 0.06, // Cost will be updated by tasks
      isPrepared: true,
    },
  });

  // The prep recipe itself
  const prepFrango = await prisma.prepRecipe.create({
    data: {
      name: "Preparo: Frango Grelhado",
      outputIngredientId: ingFrangoGrelhado.id,
      outputQuantity: 900, // 1kg cru -> 900g grelhado (10% loss)
      estimatedLaborTime: 20,
      inputs: {
        create: [
          { ingredientId: ingPeitoFrango.id, quantity: 1000 },
          { ingredientId: ingSal.id, quantity: 10 },
          { ingredientId: ingOleoSoja.id, quantity: 20 },
        ],
      },
    },
  });

  // A task to make this prep recipe
  const taskFrango = await prisma.prepTask.create({
    data: {
      prepRecipeId: prepFrango.id,
      targetQuantity: 9000, // Need 9kg
      status: PrepTaskStatus.PENDING,
      locationId: voBancadaQuente.id, // Do this at the "Bancada Quente"
    },
  });

  // 6. --- Final Products & Recipes ---
  console.log("Seeding final products...");

  const prodRefeicaoFrango = await prisma.product.create({
    data: {
      name: "Refeição - Frango Grelhado",
      price: 25.0,
      type: ProductType.FOOD,
      prepStationId: wsEmbalagem.id, // Final assembly at "Embalagem"
    },
  });

  // The recipe for the final product (links prep recipe output)
  const recipeRefeicaoFrango = await prisma.recipe.create({
    data: {
      productId: prodRefeicaoFrango.id,
      notes: "Montagem padrão: 150g frango, 100g arroz, 100g feijão.",
      ingredients: {
        create: [
          {
            ingredientId: ingFrangoGrelhado.id, // Use the *prepared* ingredient
            quantity: 150,
          },
          // Assume Arroz/Feijão are also prepared ingredients
          // For simplicity, we'll link raw here
          { ingredientId: ingArroz.id, quantity: 100 },
          { ingredientId: ingFeijao.id, quantity: 100 },
        ],
      },
      steps: {
        create: [
          { stepNumber: 1, instruction: "Pesar 150g de Frango Grelhado na GN." },
          { stepNumber: 2, instruction: "Pesar 100g de Arroz Cozido." },
          { stepNumber: 3, instruction: "Pesar 100g de Feijão Cozido." },
        ],
      },
    },
  });

  // 7. --- B2B Clients & Menus ---
  console.log("Seeding B2B clients and menus...");

  const clientTechCorp = await prisma.companyClient.create({
    data: {
      companyName: "TechCorp Soluções",
      contactName: "Fabio Gerente",
      contactPhone: "47999991111",
      contactEmail: "fabio@techcorp.com",
      addressStreet: "Rua das Palmeiras",
      addressNumber: "100",
      addressCity: "Joinville",
      employeeCount: 150,
      consumptionFactor: 1.1,
      salesPipelineStage: "Active",
    },
  });

  const clientStartupX = await prisma.companyClient.create({
    data: {
      companyName: "Startup X",
      contactName: "Maria CEO",
      contactPhone: "47988882222",
      contactEmail: "maria@startupx.com",
      addressStreet: "Avenida Principal",
      addressNumber: "5000",
      addressCity: "Joinville",
      employeeCount: 40,
      salesPipelineStage: "Lead",
    },
  });

  const menuSemana1 = await prisma.menu.create({
    data: {
      name: "Menu Básico - Semana 1",
      weekNumber: 1,
      recipes: {
        create: {
          recipeId: recipeRefeicaoFrango.id,
        },
      },
    },
  });

  // 8. --- Workflow Simulation (Assignments, Deliveries, Routes) ---
  console.log("Seeding workflow simulation...");

  const tomorrow = getFutureDate(1);

  // Assign Menu 1 to TechCorp for tomorrow
  const assignment = await prisma.dailyMenuAssignment.create({
    data: {
      assignmentDate: tomorrow,
      companyClientId: clientTechCorp.id,
      menuId: menuSemana1.id,
    },
  });

  // Create a delivery for this assignment
  const delivery = await prisma.delivery.create({
    data: {
      deliveryDate: tomorrow,
      companyClientId: clientTechCorp.id,
      status: DeliveryStatus.PENDING,
      driverId: driver.id,
      vehicleId: fiorino.id,
    },
  });

  // Create a route for tomorrow
  const route = await prisma.route.create({
    data: {
      routeDate: tomorrow,
      routeName: "Rota Norte - " + tomorrow.toISOString().split("T")[0],
      vehicleId: fiorino.id,
      driverId: driver.id,
      status: RouteStatus.PLANNED,
    },
  });

  // Add the delivery as a stop on the route
  const stop = await prisma.routeStop.create({
    data: {
      routeId: route.id,
      deliveryId: delivery.id,
      stopOrder: 1,
    },
  });

  // 9. --- Financials (PO) ---
  console.log("Seeding financials...");

  const po = await prisma.purchaseOrder.create({
    data: {
      supplierId: supplierCarnes.id,
      orderDate: new Date(),
      expectedDeliveryDate: tomorrow,
      status: POStatus.SUBMITTED,
      notes: "Pedido urgente de frango",
      items: {
        create: {
          ingredientId: ingPeitoFrango.id,
          orderedQuantity: 30, // 30kg
          orderedUnit: "kg",
          unitCost: 35.0, // Custo por kg
          totalItemCost: 30 * 35.0,
        },
      },
    },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });