// File: prisma/seed.ts
import {
  Prisma,
  PrismaClient,
  Role,
  VenueObjectType,
  WorkstationType,
  ProductType,
  PanStatus,
  POStatus,
  PrepTaskStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// Helper to wrap Prisma calls in a try-catch to ignore "table does not exist" errors
// We need this because the migration state might be behind the seed script's client
async function tryDeleteMany(model: any) {
  try {
    await model.deleteMany();
  } catch (error: any) {
    if (error.code === 'P2021' || error.code === 'P2025') {
      // P2021: Table does not exist
      // P2025: Record does not exist (for cascading deletes)
      console.log(`Skipping cleanup for model (table might not exist): ${error.meta?.modelName || 'Unknown'}`);
    } else {
      // Re-throw other errors
      throw error;
    }
  }
}

async function main() {
  console.log('Start seeding ...');

  // 1. --- Clear old data in reverse dependency order ---
  console.log('Cleaning database...');
  // --- FIX: Wrap all deletes in tryDeleteMany ---
  await tryDeleteMany(prisma.routeStop);
  await tryDeleteMany(prisma.panShipment); // This one is duplicated below, but that's fine
  await tryDeleteMany(prisma.delivery);
  await tryDeleteMany(prisma.dailyMenuAssignment);
  await tryDeleteMany(prisma.dailyConsumptionRecord);
  await tryDeleteMany(prisma.menuRecipeItem);
  await tryDeleteMany(prisma.menu);
  await tryDeleteMany(prisma.wasteRecord);
  await tryDeleteMany(prisma.panShipment);
  await tryDeleteMany(prisma.route);
  await tryDeleteMany(prisma.vehicle);
  await tryDeleteMany(prisma.staffAssignment);
  await tryDeleteMany(prisma.companyClient);
  await tryDeleteMany(prisma.purchaseOrderItem);
  await tryDeleteMany(prisma.purchaseOrder);
  await tryDeleteMany(prisma.supplier);
  await tryDeleteMany(prisma.stockHolding);
  await tryDeleteMany(prisma.prepTask);
  await tryDeleteMany(prisma.prepRecipeInput);
  await tryDeleteMany(prisma.prepRecipe);
  await tryDeleteMany(prisma.recipeStep);
  await tryDeleteMany(prisma.recipeIngredient);
  await tryDeleteMany(prisma.recipe);
  await tryDeleteMany(prisma.product);
  await tryDeleteMany(prisma.ingredient);
  await tryDeleteMany(prisma.servingPan);
  await tryDeleteMany(prisma.servingPanModel);
  await tryDeleteMany(prisma.buffetStation);
  await tryDeleteMany(prisma.clientPlate); // Added ClientPlate
  await tryDeleteMany(prisma.orderItem);
  await tryDeleteMany(prisma.staffOrderAssignment);
  await tryDeleteMany(prisma.order);
  await tryDeleteMany(prisma.serverCall);
  await tryDeleteMany(prisma.visit);
  await tryDeleteMany(prisma.tab);
  await tryDeleteMany(prisma.walletTransaction);
  await tryDeleteMany(prisma.clientWallet);
  await tryDeleteMany(prisma.client);
  await tryDeleteMany(prisma.venueObject);
  await tryDeleteMany(prisma.workstation);
  await tryDeleteMany(prisma.floorPlan);
  await tryDeleteMany(prisma.user);
  // --- END FIX ---

  // 2. --- Seed Users ---
  console.log('Seeding users...');
  const hashedPin = await bcrypt.hash('123456', SALT_ROUNDS);
  const owner = await prisma.user.create({
    data: {
      name: 'Owner User',
      email: 'owner@example.com',
      pin: hashedPin,
      role: Role.OWNER,
    },
  });
  const manager = await prisma.user.create({
    data: {
      name: 'Manager User',
      email: 'manager@example.com',
      pin: hashedPin,
      role: Role.MANAGER,
    },
  });
  const cook = await prisma.user.create({
    data: {
      name: 'Cook User',
      email: 'cook@example.com',
      pin: hashedPin,
      role: Role.COOK,
    },
  });
  const server = await prisma.user.create({
    data: {
      name: 'Server User',
      email: 'server@example.com',
      pin: hashedPin,
      role: Role.SERVER,
    },
  });
  const driver = await prisma.user.create({
    data: {
      name: 'Driver User',
      email: 'driver@example.com',
      pin: hashedPin,
      role: Role.DRIVER,
    },
  });
  const sales = await prisma.user.create({
    data: {
      name: 'Sales User',
      email: 'sales@example.com',
      pin: hashedPin,
      role: Role.SALES,
    },
  });
  const financial = await prisma.user.create({
    data: {
      name: 'Financial User',
      email: 'financial@example.com',
      pin: hashedPin,
      role: Role.FINANCIAL,
    },
  });
  const cashier = await prisma.user.create({
    data: {
      name: 'Cashier User',
      email: 'cashier@example.com',
      pin: hashedPin,
      role: Role.CASHIER,
    },
  });


  // 3. --- Seed Workstations & Floorplan ---
  console.log('Seeding floorplan and workstations...');
  const mainKitchen = await prisma.floorPlan.create({
    data: {
      name: 'Cozinha Principal',
      width: 1000,
      height: 800,
    },
  });

  const prepStation = await prisma.workstation.create({
    data: {
      name: 'Estação de Preparo',
      type: WorkstationType.PREP_STATION,
    },
  });
  const packingStation = await prisma.workstation.create({
    data: {
      name: 'Estação de Embalagem',
      type: WorkstationType.PACKING_STATION,
    },
  });
  const kds = await prisma.workstation.create({
    data: {
      name: 'KDS Cozinha',
      type: WorkstationType.KDS,
    },
  });
  // Legacy POS station
  const posStation = await prisma.workstation.create({
    data: {
      name: 'Caixa 01',
      type: WorkstationType.POS,
    },
  });


  // 4. --- Seed Storage Locations (VenueObjects) ---
  console.log('Seeding storage locations...');
  const freezer = await prisma.venueObject.create({
    data: {
      name: 'Freezer Principal',
      type: VenueObjectType.FREEZER,
      floorPlanId: mainKitchen.id,
      anchorX: 50,
      anchorY: 50,
      width: 100,
      height: 100,
      rotation: 0,
    },
  });
  const dryStorage = await prisma.venueObject.create({
    data: {
      name: 'Estoque Seco',
      type: VenueObjectType.STORAGE,
      floorPlanId: mainKitchen.id,
      anchorX: 200,
      anchorY: 50,
      width: 150,
      height: 100,
      rotation: 0,
    },
  });
  const prepArea = await prisma.venueObject.create({
    data: {
      name: 'Bancada Preparo',
      type: VenueObjectType.WORKSTATION,
      floorPlanId: mainKitchen.id,
      anchorX: 50,
      anchorY: 200,
      width: 200,
      height: 80,
      rotation: 0,
      workstationId: prepStation.id,
    },
  });
  const packingArea = await prisma.venueObject.create({
    data: {
      name: 'Bancada Embalagem',
      type: VenueObjectType.WORKSTATION,
      floorPlanId: mainKitchen.id,
      anchorX: 300,
      anchorY: 200,
      width: 150,
      height: 80,
      rotation: 0,
      workstationId: packingStation.id,
    },
  });


  // 5. --- Seed Ingredients ---
  console.log('Seeding ingredients...');
  const chickenBreast = await prisma.ingredient.create({
    data: {
      name: 'Peito de Frango',
      unit: 'g',
      costPerUnit: new Decimal(0.025), // R$ 25/kg
      isPrepared: false,
    },
  });
  const rice = await prisma.ingredient.create({
    data: {
      name: 'Arroz Agulhinha',
      unit: 'g',
      costPerUnit: new Decimal(0.005), // R$ 5/kg
      isPrepared: false,
    },
  });
  const blackBeans = await prisma.ingredient.create({
    data: {
      name: 'Feijão Preto',
      unit: 'g',
      costPerUnit: new Decimal(0.008), // R$ 8/kg
      isPrepared: false,
    },
  });
  const onion = await prisma.ingredient.create({
    data: {
      name: 'Cebola',
      unit: 'g',
      costPerUnit: new Decimal(0.004), // R$ 4/kg
      isPrepared: false,
    },
  });
  const garlic = await prisma.ingredient.create({
    data: {
      name: 'Alho',
      unit: 'g',
      costPerUnit: new Decimal(0.03), // R$ 30/kg
      isPrepared: false,
    },
  });
  const oliveOil = await prisma.ingredient.create({
    data: {
      name: 'Azeite de Oliva',
      unit: 'ml',
      costPerUnit: new Decimal(0.04), // R$ 40/L
      isPrepared: false,
    },
  });

  // Prepared Ingredients
  const cookedRice = await prisma.ingredient.create({
    data: {
      name: 'Arroz Cozido',
      unit: 'g',
      costPerUnit: new Decimal(0), // Cost will be calculated
      isPrepared: true,
    },
  });
  const cookedBeans = await prisma.ingredient.create({
    data: {
      name: 'Feijão Cozido',
      unit: 'g',
      costPerUnit: new Decimal(0), // Cost will be calculated
      isPrepared: true,
    },
  });
  const grilledChicken = await prisma.ingredient.create({
    data: {
      name: 'Frango Grelhado',
      unit: 'g',
      costPerUnit: new Decimal(0), // Cost will be calculated
      isPrepared: true,
    },
  });


  // 6. --- Seed Stock Holdings (Inventory) ---
  console.log('Seeding stock holdings...');
  await prisma.stockHolding.create({
    data: {
      ingredientId: chickenBreast.id,
      venueObjectId: freezer.id,
      quantity: new Decimal(10000), // 10kg
      costAtAcquisition: new Decimal(0.025),
      purchaseDate: new Date(),
    },
  });
  await prisma.stockHolding.create({
    data: {
      ingredientId: rice.id,
      venueObjectId: dryStorage.id,
      quantity: new Decimal(25000), // 25kg
      costAtAcquisition: new Decimal(0.005),
      purchaseDate: new Date(),
    },
  });
  await prisma.stockHolding.create({
    data: {
      ingredientId: blackBeans.id,
      venueObjectId: dryStorage.id,
      quantity: new Decimal(15000), // 15kg
      costAtAcquisition: new Decimal(0.008),
      purchaseDate: new Date(),
    },
  });
  await prisma.stockHolding.create({
    data: {
      ingredientId: onion.id,
      venueObjectId: dryStorage.id,
      quantity: new Decimal(5000), // 5kg
      costAtAcquisition: new Decimal(0.004),
      purchaseDate: new Date(),
    },
  });
  await prisma.stockHolding.create({
    data: {
      ingredientId: garlic.id,
      venueObjectId: dryStorage.id,
      quantity: new Decimal(1000), // 1kg
      costAtAcquisition: new Decimal(0.03),
      purchaseDate: new Date(),
    },
  });


  // 7. --- Seed Prep Recipes ---
  console.log('Seeding prep recipes...');
  const prepRice = await prisma.prepRecipe.create({
    data: {
      name: 'Preparo Arroz Cozido',
      outputIngredientId: cookedRice.id,
      outputQuantity: new Decimal(1900), // 1kg rice -> 1.9kg cooked (approx)
      estimatedLaborTime: 30,
      inputs: {
        create: [
          { ingredientId: rice.id, quantity: new Decimal(1000) },
          { ingredientId: onion.id, quantity: new Decimal(50) },
          { ingredientId: garlic.id, quantity: new Decimal(20) },
          { ingredientId: oliveOil.id, quantity: new Decimal(30) },
        ],
      },
    },
  });
  const prepBeans = await prisma.prepRecipe.create({
    data: {
      name: 'Preparo Feijão Cozido',
      outputIngredientId: cookedBeans.id,
      outputQuantity: new Decimal(2000), // 1kg beans -> 2kg cooked (approx)
      estimatedLaborTime: 60,
      inputs: {
        create: [
          { ingredientId: blackBeans.id, quantity: new Decimal(1000) },
          { ingredientId: onion.id, quantity: new Decimal(100) },
          { ingredientId: garlic.id, quantity: new Decimal(30) },
          { ingredientId: oliveOil.id, quantity: new Decimal(30) },
        ],
      },
    },
  });
  const prepChicken = await prisma.prepRecipe.create({
    data: {
      name: 'Preparo Frango Grelhado',
      outputIngredientId: grilledChicken.id,
      outputQuantity: new Decimal(750), // 1kg raw -> 750g cooked (shrinkage)
      estimatedLaborTime: 45,
      inputs: {
        create: [
          { ingredientId: chickenBreast.id, quantity: new Decimal(1000) },
          { ingredientId: oliveOil.id, quantity: new Decimal(20) },
        ],
      },
    },
  });


  // 8. --- Seed Products & Recipes (Final Dishes) ---
  console.log('Seeding products and recipes...');
  const pfCompleto = await prisma.product.create({
    data: {
      name: 'PF Completo (Frango)',
      price: new Decimal(25.0),
      type: ProductType.FOOD,
      prepStationId: packingStation.id, // Packed here
      recipe: {
        create: {
          notes: 'Prato Feito padrão da casa',
          ingredients: {
            create: [
              { ingredientId: cookedRice.id, quantity: new Decimal(200) },
              { ingredientId: cookedBeans.id, quantity: new Decimal(150) },
              { ingredientId: grilledChicken.id, quantity: new Decimal(120) },
            ],
          },
        },
      },
    },
  });

  const pfVegetariano = await prisma.product.create({
    data: {
      name: 'PF Vegetariano (Omelete)',
      price: new Decimal(22.0),
      type: ProductType.FOOD,
      prepStationId: kds.id, // Made on demand
      recipe: {
        create: {
          notes: 'PF sem carne',
          ingredients: {
            create: [
              { ingredientId: cookedRice.id, quantity: new Decimal(200) },
              { ingredientId: cookedBeans.id, quantity: new Decimal(150) },
              { ingredientId: onion.id, quantity: new Decimal(30) }, // Omelete ingredient
            ],
          },
        },
      },
    },
  });


  // 9. --- Seed B2B Company Clients ---
  console.log('Seeding company clients...');
  const clientA = await prisma.companyClient.create({
    data: {
      companyName: 'TechCorp Software',
      contactName: 'Ana Silva',
      contactPhone: '11999991234',
      contactEmail: 'ana.silva@techcorp.com',
      cnpj: '12.345.678/0001-01',
      addressStreet: 'Rua das Flores',
      addressNumber: '123',
      addressCity: 'São Paulo',
      addressState: 'SP',
      addressZipCode: '01010-010',
      employeeCount: 50,
      consumptionFactor: 1.1,
      salesPipelineStage: 'Active',
    },
  });
  const clientB = await prisma.companyClient.create({
    data: {
      companyName: 'InovaLog Transportes',
      contactName: 'Bruno Costa',
      contactPhone: '47988884321',
      contactEmail: 'bruno.costa@inovalog.com',
      cnpj: '87.654.321/0001-02',
      addressStreet: 'Avenida Brasil',
      addressNumber: '1000',
      addressCity: 'Joinville',
      addressState: 'SC',
      addressZipCode: '89200-000',
      employeeCount: 30,
      consumptionFactor: 1.0,
      salesPipelineStage: 'Active',
    },
  });
  const clientC = await prisma.companyClient.create({
    data: {
      companyName: 'Futura Contabilidade',
      contactName: 'Carla Dias',
      contactPhone: '21977775678',
      contactEmail: 'carla.dias@futura.com',
      salesPipelineStage: 'Lead',
    },
  });

  // 10. --- Seed Logistics ---
  console.log('Seeding vehicles...');
  const fiorino = await prisma.vehicle.create({
    data: {
      model: 'Fiat Fiorino',
      licensePlate: 'ABC1234',
    },
  });

  // 11. --- Seed Suppliers & POs ---
  console.log('Seeding suppliers and POs...');
  const hortifruti = await prisma.supplier.create({
    data: {
      name: 'Hortifruti Bom Preço',
      contactName: 'Sr. Manuel',
      contactPhone: '4734345678',
    },
  });
  const acougue = await prisma.supplier.create({
    data: {
      name: 'Açougue Carne Nobre',
      contactName: 'Carlos',
      contactPhone: '4734349988',
    },
  });

  await prisma.purchaseOrder.create({
    data: {
      supplierId: acougue.id,
      orderDate: new Date(),
      status: POStatus.DRAFT,
      items: {
        create: {
          ingredientId: chickenBreast.id,
          orderedQuantity: new Decimal(50), // 50
          orderedUnit: 'kg', // kg
          unitCost: new Decimal(25.0), // 25.00 / kg
          totalItemCost: new Decimal(1250.00), // 50 * 25
        },
      },
    },
  });

  // 12. --- Seed Legacy Client/Visit (for ClientPlate) ---
  console.log('Seeding legacy client and visit...');
  try {
    const legacyClient = await prisma.client.create({
      data: {
        name: 'Cliente Balcão Teste',
        phone: '47900001111',
      },
    });

    const legacyVisit = await prisma.visit.create({
      data: {
        clientId: legacyClient.id,
        status: 'ACTIVE',
      },
    });
    console.log(`Created legacy client ${legacyClient.id} and visit ${legacyVisit.id}`);
  } catch (error) {
     console.error("Failed to create legacy client/visit (might not exist in schema):", error);
  }


  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });