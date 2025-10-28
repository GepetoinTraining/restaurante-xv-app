// PATH: prisma/seed.ts
import { PrismaClient, Role, ProductType, VenueObjectType } from '@prisma/client'; // Added VenueObjectType
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library'; // Import Decimal

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Corrected Seed Script ---');

  try {
    // --- 0. Upsert Workstations ---
    console.log('Upserting Workstations...');
    const kitchen = await prisma.workstation.upsert({
      where: { name: 'KITCHEN' },
      update: {},
      create: { name: 'KITCHEN', type: 'KDS' }, // Added type example
    });
    console.log(`Upserted Workstation: ${kitchen.name} (ID: ${kitchen.id})`);

    const bbqStation = await prisma.workstation.upsert({
      where: { name: 'BBQ' },
      update: {},
      create: { name: 'BBQ', type: 'KDS'}, // Added type example
    });
    console.log(`Upserted Workstation: ${bbqStation.name} (ID: ${bbqStation.id})`);

    const coldStation = await prisma.workstation.upsert({
      where: { name: 'COLD_STATION' },
      update: {},
      create: { name: 'COLD_STATION', type: 'KDS' }, // Added type example
    });
    console.log(`Upserted Workstation: ${coldStation.name} (ID: ${coldStation.id})`);

    // --- NEW: Create a Default Floor Plan ---
    console.log('Upserting Default Floor Plan...');
    const defaultFloorPlan = await prisma.floorPlan.upsert({
        where: { name: 'Default Plan' },
        update: {},
        create: { name: 'Default Plan', width: 100, height: 100 },
    });
    console.log(`Upserted FloorPlan: ${defaultFloorPlan.name} (ID: ${defaultFloorPlan.id})`);


    console.log('Workstations & Floor Plan seeded.');

    // --- 1. Seed Raw Ingredients (isPrepared: false) ---
    console.log('Seeding Raw Ingredients...');
    const arrozCru = await prisma.ingredient.upsert({
      where: { name: 'Arroz Agulhinha Cru' },
      update: { costPerUnit: 0.005 }, // Example: Update cost if needed
      create: { name: 'Arroz Agulhinha Cru', unit: 'g', costPerUnit: 0.005, isPrepared: false }, // R$5/kg
    });
    const feijaoCru = await prisma.ingredient.upsert({
      where: { name: 'Feijão Carioca Cru' },
      update: { costPerUnit: 0.008 },
      create: { name: 'Feijão Carioca Cru', unit: 'g', costPerUnit: 0.008, isPrepared: false }, // R$8/kg
    });
    const cebola = await prisma.ingredient.upsert({
      where: { name: 'Cebola Pera' },
      update: { costPerUnit: 0.004 },
      create: { name: 'Cebola Pera', unit: 'g', costPerUnit: 0.004, isPrepared: false }, // R$4/kg
    });
    const alho = await prisma.ingredient.upsert({
      where: { name: 'Alho Granel' },
      update: { costPerUnit: 0.02 },
      create: { name: 'Alho Granel', unit: 'g', costPerUnit: 0.02, isPrepared: false }, // R$20/kg
    });
    const oleoSoja = await prisma.ingredient.upsert({
      where: { name: 'Óleo de Soja' },
      update: { costPerUnit: 0.009 },
      create: { name: 'Óleo de Soja', unit: 'ml', costPerUnit: 0.009, isPrepared: false }, // R$9/L
    });
    const sal = await prisma.ingredient.upsert({
      where: { name: 'Sal Refinado' },
      update: { costPerUnit: 0.002 },
      create: { name: 'Sal Refinado', unit: 'g', costPerUnit: 0.002, isPrepared: false }, // R$2/kg
    });
    const folhaLouro = await prisma.ingredient.upsert({
      where: { name: 'Folha de Louro' },
      update: { costPerUnit: 0.1 },
      create: { name: 'Folha de Louro', unit: 'unidade', costPerUnit: 0.1, isPrepared: false }, // R$0.10/folha
    });
    const tomate = await prisma.ingredient.upsert({
      where: { name: 'Tomate Saladete' },
      update: { costPerUnit: 0.006 },
      create: { name: 'Tomate Saladete', unit: 'g', costPerUnit: 0.006, isPrepared: false }, // R$6/kg
    });
    const alface = await prisma.ingredient.upsert({
      where: { name: 'Alface Crespa' },
      update: { costPerUnit: 0.005 },
      create: { name: 'Alface Crespa', unit: 'g', costPerUnit: 0.005, isPrepared: false }, // R$5/kg
    });
    const cenoura = await prisma.ingredient.upsert({
      where: { name: 'Cenoura' },
      update: { costPerUnit: 0.004 },
      create: { name: 'Cenoura', unit: 'g', costPerUnit: 0.004, isPrepared: false }, // R$4/kg
    });
    const macarraoPenne = await prisma.ingredient.upsert({
      where: { name: 'Macarrão Penne Seco' },
      update: { costPerUnit: 0.007 },
      create: { name: 'Macarrão Penne Seco', unit: 'g', costPerUnit: 0.007, isPrepared: false }, // R$7/kg
    });
    const carneMoida = await prisma.ingredient.upsert({
      where: { name: 'Carne Moída (Patinho)' },
      update: { costPerUnit: 0.035 },
      create: { name: 'Carne Moída (Patinho)', unit: 'g', costPerUnit: 0.035, isPrepared: false }, // R$35/kg
    });
    const molhoTomate = await prisma.ingredient.upsert({
      where: { name: 'Molho de Tomate Pelado Lata' },
      update: { costPerUnit: 0.01 },
      create: { name: 'Molho de Tomate Pelado Lata', unit: 'g', costPerUnit: 0.01, isPrepared: false }, // R$10/kg
    });
    const massaLasanha = await prisma.ingredient.upsert({
      where: { name: 'Massa de Lasanha Pré-cozida' },
      update: { costPerUnit: 0.015 },
      create: { name: 'Massa de Lasanha Pré-cozida', unit: 'g', costPerUnit: 0.015, isPrepared: false }, // R$15/kg
    });
    const queijoMussarela = await prisma.ingredient.upsert({
      where: { name: 'Queijo Mussarela Fatiado' },
      update: { costPerUnit: 0.04 },
      create: { name: 'Queijo Mussarela Fatiado', unit: 'g', costPerUnit: 0.04, isPrepared: false }, // R$40/kg
    });
    const presunto = await prisma.ingredient.upsert({
      where: { name: 'Presunto Cozido Fatiado' },
      update: { costPerUnit: 0.03 },
      create: { name: 'Presunto Cozido Fatiado', unit: 'g', costPerUnit: 0.03, isPrepared: false }, // R$30/kg
    });
    const picanha = await prisma.ingredient.upsert({
      where: { name: 'Picanha Peça' },
      update: { costPerUnit: 0.08 },
      create: { name: 'Picanha Peça', unit: 'g', costPerUnit: 0.08, isPrepared: false }, // R$80/kg
    });
    const linguica = await prisma.ingredient.upsert({
      where: { name: 'Linguiça Toscana' },
      update: { costPerUnit: 0.025 },
      create: { name: 'Linguiça Toscana', unit: 'g', costPerUnit: 0.025, isPrepared: false }, // R$25/kg
    });
    // Add Vodka and Lime for Recipe example
     const vodkaAbsolut = await prisma.ingredient.upsert({
       where: { name: 'Vodka Absolut' },
       update: { costPerUnit: 65.00 },
       create: { name: 'Vodka Absolut', unit: 'unidade', costPerUnit: 65.00, isPrepared: false }, // Assuming unit is 1L bottle
     });
     const limaoSiciliano = await prisma.ingredient.upsert({
        where: { name: 'Limão Siciliano' },
        update: { costPerUnit: 1.50 },
        create: { name: 'Limão Siciliano', unit: 'unidade', costPerUnit: 1.50, isPrepared: false },
      });

    console.log('Raw Ingredients seeded.');

    // --- 2. Seed Prepared Ingredients (isPrepared: true, costPerUnit: 0 initially) ---
    console.log('Seeding Prepared Ingredients...');
    const arrozCozido = await prisma.ingredient.upsert({
      where: { name: 'Arroz Branco Cozido' },
      update: {}, // Cost will be calculated by Prep Tasks
      create: { name: 'Arroz Branco Cozido', unit: 'g', costPerUnit: 0, isPrepared: true },
    });
    const feijaoCozido = await prisma.ingredient.upsert({
      where: { name: 'Feijão Carioca Cozido' },
      update: {},
      create: { name: 'Feijão Carioca Cozido', unit: 'g', costPerUnit: 0, isPrepared: true },
    });
    const cebolaPicada = await prisma.ingredient.upsert({
      where: { name: 'Cebola Picada' },
      update: {},
      create: { name: 'Cebola Picada', unit: 'g', costPerUnit: 0, isPrepared: true },
    });
    const alhoPicado = await prisma.ingredient.upsert({
      where: { name: 'Alho Picado' },
      update: {},
      create: { name: 'Alho Picado', unit: 'g', costPerUnit: 0, isPrepared: true },
    });
    const molhoBolonhesa = await prisma.ingredient.upsert({
      where: { name: 'Molho Bolonhesa' },
      update: {},
      create: { name: 'Molho Bolonhesa', unit: 'g', costPerUnit: 0, isPrepared: true },
    });
    const vinagrete = await prisma.ingredient.upsert({
       where: { name: 'Vinagrete Simples' },
       update: {},
       create: { name: 'Vinagrete Simples', unit: 'g', costPerUnit: 0, isPrepared: true },
     });
    console.log('Prepared Ingredients seeded.');

    // --- 3. Seed Prep Recipes ---
    console.log('Seeding Prep Recipes...');
    // Ex: Cebola Picada (Yield ~90% of raw weight)
    await prisma.prepRecipe.upsert({
      where: { name: 'Picar Cebola' },
      update: {},
      create: {
        name: 'Picar Cebola',
        outputIngredientId: cebolaPicada.id,
        outputQuantity: 900, // Produces 900g
        notes: 'Descascar e picar em cubos pequenos (~5mm).',
        estimatedLaborTime: 10, // minutes per kg raw
        inputs: {
          create: [{ ingredientId: cebola.id, quantity: 1000 }], // Requires 1000g raw
        },
      },
    });
     // Ex: Alho Picado (Yield ~95%?)
     await prisma.prepRecipe.upsert({
       where: { name: 'Picar Alho' },
       update: {},
       create: {
         name: 'Picar Alho',
         outputIngredientId: alhoPicado.id,
         outputQuantity: 95, // ~95g from 100g raw
         notes: 'Descascar e picar finamente.',
         estimatedLaborTime: 15, // minutes per 100g raw
         inputs: {
           create: [{ ingredientId: alho.id, quantity: 100 }],
         },
       },
     });
    // Ex: Arroz Cozido (Yield ~2.5x of raw weight)
    await prisma.prepRecipe.upsert({
       where: { name: 'Cozinhar Arroz Branco' },
       update: {},
       create: {
         name: 'Cozinhar Arroz Branco',
         outputIngredientId: arrozCozido.id,
         outputQuantity: 2500, // Yields 2.5kg cooked
         notes: 'Refogar alho picado e cebola picada (opcional) no óleo. Adicionar arroz cru e sal, refogar mais um pouco. Adicionar água fervente (~2L). Cozinhar em fogo baixo até a água secar.',
         estimatedLaborTime: 25, // minutes total
         inputs: {
           create: [
             { ingredientId: arrozCru.id, quantity: 1000 }, // 1kg Arroz
             { ingredientId: alhoPicado.id, quantity: 10 }, // Use prepared alho
             { ingredientId: cebolaPicada.id, quantity: 20 }, // Use prepared cebola
             { ingredientId: oleoSoja.id, quantity: 30 }, // 30ml Óleo
             { ingredientId: sal.id, quantity: 15 }, // 15g Sal
             // Water isn't tracked as an ingredient with cost
           ],
         },
       },
     });
     // Ex: Feijão Cozido (Yield ~2.2x?)
     await prisma.prepRecipe.upsert({
        where: { name: 'Cozinhar Feijão Carioca' },
        update: {},
        create: {
          name: 'Cozinhar Feijão Carioca',
          outputIngredientId: feijaoCozido.id,
          outputQuantity: 2200, // ~2.2kg cooked from 1kg raw
          notes: 'Deixar feijão de molho. Cozinhar na pressão com água e louro. Refogar alho/cebola (opcional), adicionar feijão cozido e temperar com sal.',
          estimatedLaborTime: 60, // minutes total (incl pressure cooking)
          inputs: {
            create: [
              { ingredientId: feijaoCru.id, quantity: 1000 },
              { ingredientId: folhaLouro.id, quantity: 2 },
              // Optional refogado
              { ingredientId: oleoSoja.id, quantity: 20 },
              { ingredientId: alhoPicado.id, quantity: 10 },
              { ingredientId: cebolaPicada.id, quantity: 20 },
              { ingredientId: sal.id, quantity: 15 },
            ],
          },
        },
      });
    // Ex: Molho Bolonhesa
    await prisma.prepRecipe.upsert({
       where: { name: 'Preparar Molho Bolonhesa' },
       update: {},
       create: {
         name: 'Preparar Molho Bolonhesa',
         outputIngredientId: molhoBolonhesa.id,
         outputQuantity: 1800, // Approx yield from 1kg meat + 1kg sauce
         notes: 'Refogar cebola/alho, adicionar carne moída e cozinhar. Adicionar molho de tomate e temperos. Cozinhar em fogo baixo.',
         estimatedLaborTime: 45,
         inputs: {
           create: [
             { ingredientId: carneMoida.id, quantity: 1000 },
             { ingredientId: molhoTomate.id, quantity: 1000 },
             { ingredientId: cebolaPicada.id, quantity: 100 },
             { ingredientId: alhoPicado.id, quantity: 20 },
             { ingredientId: oleoSoja.id, quantity: 30 },
             { ingredientId: sal.id, quantity: 10 },
             // Add other spices like oregano, pepper if they are Ingredients
           ],
         },
       },
     });
    console.log('Prep Recipes seeded.');

    // --- 4. Seed Final Products (using price, no priceUnit) ---
    console.log('Seeding Final Products...');
    // Simple Product (direct link to ingredient) - REMOVED ingredientId link
    const arrozBuffet = await prisma.product.upsert({
      where: { name: 'Arroz Branco (Buffet)' },
      update: {},
      create: {
        name: 'Arroz Branco (Buffet)',
        description: 'Arroz branco soltinho.',
        price: 30.00, // Price per KG on buffet
        // REMOVED: priceUnit: 'kg',
        type: ProductType.FOOD,
        prepStationId: kitchen.id,
        // REMOVED: ingredientId: arrozCozido.id,
      },
    });
    const feijaoBuffet = await prisma.product.upsert({
      where: { name: 'Feijão Carioca (Buffet)' },
      update: {},
      create: {
        name: 'Feijão Carioca (Buffet)',
        description: 'Feijão carioca temperado.',
        price: 35.00, // Price per KG
        // REMOVED: priceUnit: 'kg',
        type: ProductType.FOOD,
        prepStationId: kitchen.id,
        // REMOVED: ingredientId: feijaoCozido.id,
      },
    });
    const alfaceBuffet = await prisma.product.upsert({
      where: { name: 'Alface Crespa (Buffet)' },
      update: {},
      create: {
        name: 'Alface Crespa (Buffet)',
        description: 'Folhas frescas de alface crespa.',
        price: 20.00, // Price per KG
        // REMOVED: priceUnit: 'kg',
        type: ProductType.FOOD,
        prepStationId: coldStation.id,
        // REMOVED: ingredientId: alface.id,
      },
    });
    const tomateBuffet = await prisma.product.upsert({
       where: { name: 'Tomate em Rodelas (Buffet)' },
       update: {},
       create: {
         name: 'Tomate em Rodelas (Buffet)',
         description: 'Tomate fresco fatiado.',
         price: 25.00,
         // REMOVED: priceUnit: 'kg',
         type: ProductType.FOOD,
         prepStationId: coldStation.id,
         // REMOVED: ingredientId: tomate.id,
       },
     });

    // Product with Recipe (Lasanha Bolonhesa)
    const lasanhaBolonhesa = await prisma.product.upsert({
       where: { name: 'Lasanha à Bolonhesa' },
       update: {},
       create: {
         name: 'Lasanha à Bolonhesa',
         description: 'Camadas de massa, molho bolonhesa, presunto e queijo.',
         price: 60.00, // Price per KG
         // REMOVED: priceUnit: 'kg',
         type: ProductType.FOOD,
         prepStationId: kitchen.id, // Prepared in kitchen
         // No direct ingredient link, uses recipe below
       },
     });

    // BBQ Items (Simple link to raw ingredient, assuming prep is just grilling)
    const picanhaBBQ = await prisma.product.upsert({
       where: { name: 'Picanha Grelhada (BBQ)' },
       update: {},
       create: {
         name: 'Picanha Grelhada (BBQ)',
         description: 'Fatias de picanha grelhada no ponto.',
         price: 120.00, // Price per KG
         // REMOVED: priceUnit: 'kg',
         type: ProductType.FOOD,
         prepStationId: bbqStation.id, // Assigned to BBQ station
         // REMOVED: ingredientId: picanha.id,
       },
     });
    const linguicaBBQ = await prisma.product.upsert({
      where: { name: 'Linguiça Grelhada (BBQ)' },
      update: {},
      create: {
        name: 'Linguiça Grelhada (BBQ)',
        description: 'Linguiça toscana grelhada.',
        price: 50.00,
        // REMOVED: priceUnit: 'kg',
        type: ProductType.FOOD,
        prepStationId: bbqStation.id,
        // REMOVED: ingredientId: linguica.id,
      },
    });

     // Drink Example
     const caipirinha = await prisma.product.upsert({
        where: { name: 'Caipirinha Limão' },
        update: {},
        create: {
          name: 'Caipirinha Limão',
          description: 'Cachaça, limão, açúcar e gelo.',
          price: 18.00,
          type: ProductType.DRINK,
          prepStationId: coldStation.id, // Or a dedicated Bar station
        },
      });

    console.log('Final Products seeded.');

    // --- 5. Seed Product Recipes (where needed) ---
    console.log('Seeding Product Recipes...');
    // Lasanha Bolonhesa Recipe (Example Portion ~1kg total?)
    await prisma.recipe.upsert({
      where: { productId: lasanhaBolonhesa.id },
      update: {}, // Or update ingredients/steps if recipe changes
      create: {
        productId: lasanhaBolonhesa.id,
        notes: 'Montar em camadas: molho, massa, presunto, queijo, molho... Assar a 180°C por ~25 min.',
        difficulty: 3,
        ingredients: {
          create: [
            { ingredientId: massaLasanha.id, quantity: 250 }, // 250g Massa
            { ingredientId: molhoBolonhesa.id, quantity: 500 }, // 500g Molho (prepared)
            { ingredientId: queijoMussarela.id, quantity: 200 }, // 200g Queijo
            { ingredientId: presunto.id, quantity: 200 }, // 200g Presunto
          ],
        },
        steps: {
          create: [
            { stepNumber: 1, instruction: 'Espalhe molho no fundo.' },
            { stepNumber: 2, instruction: 'Camada de massa.' },
            { stepNumber: 3, instruction: 'Camada de presunto e queijo.' },
            { stepNumber: 4, instruction: 'Repita as camadas, finalize com molho e queijo.' },
            { stepNumber: 5, instruction: 'Asse a 180°C por ~25 minutos ou até dourar.' },
          ],
        },
      },
    });
     // Caipirinha Recipe (Example for 1 drink)
     await prisma.recipe.upsert({
        where: { productId: caipirinha.id },
        update: {},
        create: {
          productId: caipirinha.id,
          notes: 'Macerar limão com açúcar, adicionar cachaça e gelo, mexer bem.',
          difficulty: 1,
          ingredients: {
            create: [
              // Assuming a Cachaça ingredient exists with unit 'ml'
              // { ingredientId: cachaca.id, quantity: 60 },
              { ingredientId: limaoSiciliano.id, quantity: 1 }, // 1 limão
              // Assuming Açucar ingredient exists with unit 'g'
              // { ingredientId: acucar.id, quantity: 15 }, // 15g açúcar
            ],
          },
          steps: {
            create: [
              { stepNumber: 1, instruction: 'Corte o limão e retire o miolo branco.' },
              { stepNumber: 2, instruction: 'Macere o limão com o açúcar no copo.' },
              { stepNumber: 3, instruction: 'Adicione a cachaça e gelo.' },
              { stepNumber: 4, instruction: 'Mexa bem e sirva.' },
            ],
          },
        },
      });
    console.log('Product Recipes seeded.');

    // --- 6. Seed Default Owner ---
    console.log('Upserting Default Owner...');
    const defaultPin = '123456';
    const hashedPin = await bcrypt.hash(defaultPin, 10);
    const owner = await prisma.user.upsert({
      where: { email: 'owner@venue.com' },
      update: { pin: hashedPin, isActive: true, role: Role.OWNER, name: 'Default Owner' }, // Ensure role/name are updated
      create: {
        name: 'Default Owner',
        email: 'owner@venue.com',
        pin: hashedPin,
        role: Role.OWNER,
        isActive: true,
      },
    });
    console.log(`Upserted Owner: ${owner.name} (ID: ${owner.id})`);
    console.log('Default owner seeded. PIN used: 123456');

    // --- 7. Seed Storage Locations (as VenueObjects) ---
    console.log('Seeding Storage Locations (as VenueObjects)...');

    // Make sure name is unique *within this FloorPlan* for upserting
    // Using a composite unique constraint or handling potential conflicts might be needed in real apps
    await prisma.venueObject.upsert({
      where: { qrCodeId: 'loc-estoque-seco' }, // Use qrCodeId as unique key for seeding upserts
      update: {},
      create: {
          name: 'Estoque Seco Principal',
          type: VenueObjectType.STORAGE,
          floorPlanId: defaultFloorPlan.id,
          anchorX: 10, anchorY: 10, // Placeholder position
          qrCodeId: 'loc-estoque-seco' // Add a unique ID
      }
    });
    await prisma.venueObject.upsert({
       where: { qrCodeId: 'loc-camara-fria-1' },
       update: {},
       create: {
           name: 'Câmara Fria 1',
           type: VenueObjectType.FREEZER, // Changed to Freezer as schema doesn't have REFRIGERATOR
           floorPlanId: defaultFloorPlan.id,
           anchorX: 10, anchorY: 20,
           qrCodeId: 'loc-camara-fria-1'
       }
    });
     await prisma.venueObject.upsert({
       where: { qrCodeId: 'loc-freezer-cozinha' },
       update: {},
       create: {
           name: 'Freezer Cozinha',
           type: VenueObjectType.FREEZER, // Type is Freezer
           floorPlanId: defaultFloorPlan.id,
           anchorX: 20, anchorY: 10,
           // Link to workstation happens implicitly through workstationId if needed later, not directly here
           qrCodeId: 'loc-freezer-cozinha'
       }
     });
     // This represents the workstation itself, also potentially a storage location type
      await prisma.venueObject.upsert({
        where: { qrCodeId: 'loc-bancada-fria' },
        update: {},
        create: {
            name: 'Bancada Fria Saladas',
            type: VenueObjectType.WORKSTATION_STORAGE, // Use a storage type linked to workstation conceptually
            floorPlanId: defaultFloorPlan.id,
            anchorX: 20, anchorY: 20,
            workstationId: coldStation.id, // Explicitly link to the workstation
            qrCodeId: 'loc-bancada-fria'
        }
      });
      // Also seed the other workstations as VenueObjects
      await prisma.venueObject.upsert({
        where: { qrCodeId: 'loc-cozinha-pass' },
        update: {},
        create: {
            name: 'Pass Cozinha',
            type: VenueObjectType.WORKSTATION, // This IS the workstation object
            floorPlanId: defaultFloorPlan.id,
            anchorX: 25, anchorY: 15,
            workstationId: kitchen.id, // Link to the workstation model
            qrCodeId: 'loc-cozinha-pass'
        }
      });
       await prisma.venueObject.upsert({
        where: { qrCodeId: 'loc-churrasqueira' },
        update: {},
        create: {
            name: 'Churrasqueira',
            type: VenueObjectType.WORKSTATION,
            floorPlanId: defaultFloorPlan.id,
            anchorX: 30, anchorY: 10,
            workstationId: bbqStation.id,
            qrCodeId: 'loc-churrasqueira'
        }
      });

    console.log('Storage Locations (as VenueObjects) seeded.');

  } catch (e) {
    console.error('!!! ERROR DURING SEEDING !!!:', e);
    process.exit(1);
  } finally {
    console.log('Disconnecting Prisma...');
    await prisma.$disconnect();
  }

  console.log('--- Corrected Seed Script Finished Successfully ---');
}

main();