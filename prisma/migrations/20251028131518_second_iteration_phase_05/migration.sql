-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SERVER', 'BARTENDER', 'COOK', 'CASHIER', 'DJ', 'MANAGER', 'OWNER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TOP_UP', 'SPEND', 'REFUND');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VenueObjectType" AS ENUM ('TABLE', 'BAR_SEAT', 'WORKSTATION', 'WORKSTATION_STORAGE', 'STORAGE', 'FREEZER', 'SHELF', 'ENTERTAINMENT', 'IMPASSABLE', 'DOOR', 'WINDOW', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkstationType" AS ENUM ('POS', 'KDS', 'PRINTER', 'BAR_DISPLAY', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('FOOD', 'DRINK', 'OTHER');

-- CreateEnum
CREATE TYPE "PrepTaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PROBLEM');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ServerCallStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EntertainerType" AS ENUM ('DJ', 'BAND', 'SOLO_ARTIST', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteReason" AS ENUM ('SPOILAGE', 'PREPARATION', 'ACCIDENT', 'OVERPRODUCTION', 'PORTIONING', 'CUSTOMER_RETURN', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SERVER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "notes" TEXT,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_wallets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT "client_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "proofOfPay" TEXT,
    "notes" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "checkInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMP(3),
    "totalSpent" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT NOT NULL,
    "tabId" TEXT,
    "venueObjectId" TEXT,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rfid" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "tabs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floor_plans" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venue_objects" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "VenueObjectType" NOT NULL,
    "floorPlanId" TEXT NOT NULL,
    "anchorX" DOUBLE PRECISION NOT NULL,
    "anchorY" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "rotation" DOUBLE PRECISION,
    "capacity" INTEGER,
    "isReservable" BOOLEAN NOT NULL DEFAULT false,
    "reservationCost" DECIMAL(10,2),
    "qrCodeId" TEXT,
    "notes" TEXT,
    "workstationId" TEXT,

    CONSTRAINT "venue_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workstations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WorkstationType" NOT NULL DEFAULT 'POS',
    "ipAddress" TEXT,
    "notes" TEXT,

    CONSTRAINT "workstations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_assignments" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "venueObjectId" TEXT NOT NULL,

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "type" "ProductType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "prepStationId" TEXT NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "notes" TEXT,
    "difficulty" INTEGER DEFAULT 1,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_steps" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,

    CONSTRAINT "recipe_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DECIMAL(10,4) NOT NULL,
    "isPrepared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_holdings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "venueObjectId" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "costAtAcquisition" DECIMAL(10,4),

    CONSTRAINT "stock_holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_recipes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "outputIngredientId" TEXT NOT NULL,
    "outputQuantity" DECIMAL(10,4) NOT NULL,
    "notes" TEXT,
    "estimatedLaborTime" INTEGER,

    CONSTRAINT "prep_recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_recipe_inputs" (
    "id" TEXT NOT NULL,
    "prepRecipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,

    CONSTRAINT "prep_recipe_inputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prep_tasks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prepRecipeId" TEXT NOT NULL,
    "targetQuantity" DECIMAL(10,4) NOT NULL,
    "quantityRun" DECIMAL(10,4),
    "status" "PrepTaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToUserId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executedById" TEXT,
    "locationId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "prep_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visitId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "workstationId" TEXT NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_order_assignments" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "staff_order_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_calls" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venueObjectId" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "status" "ServerCallStatus" NOT NULL DEFAULT 'PENDING',
    "acknowledgedById" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "server_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entertainers" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EntertainerType" NOT NULL,
    "bio" TEXT,
    "imageUrl" TEXT,
    "rate" DECIMAL(10,2),

    CONSTRAINT "entertainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "entertainerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "scheduled_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinyl_library_slots" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "row" INTEGER NOT NULL,
    "column" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "vinyl_library_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinyl_records" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "genre" TEXT,
    "year" INTEGER,
    "imageUrl" TEXT,
    "notes" TEXT,
    "slotId" TEXT NOT NULL,
    "positionInSlot" INTEGER NOT NULL,

    CONSTRAINT "vinyl_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_sessions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actualStartTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualEndTime" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "dj_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dj_set_tracks" (
    "id" TEXT NOT NULL,
    "djSessionId" TEXT NOT NULL,
    "vinylRecordId" TEXT NOT NULL,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "dj_set_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buffet_stations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "buffet_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buffet_pans" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "buffetStationId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "currentQuantity" DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    "capacity" DECIMAL(10,4) NOT NULL,
    "displayOrder" INTEGER,
    "notes" TEXT,

    CONSTRAINT "buffet_pans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_plates" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "weighedById" TEXT NOT NULL,
    "totalWeightGrams" DECIMAL(10,2) NOT NULL,
    "tareWeightGrams" DECIMAL(10,2) NOT NULL,
    "netWeightGrams" DECIMAL(10,2) NOT NULL,
    "calculatedCost" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "estimatedContents" JSONB,
    "notes" TEXT,

    CONSTRAINT "client_plates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_records" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT NOT NULL,
    "ingredientId" TEXT,
    "productId" TEXT,
    "stockHoldingId" TEXT,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" "WasteReason" NOT NULL DEFAULT 'SPOILAGE',
    "costValue" DECIMAL(10,4) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "waste_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "clients_email_key" ON "clients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_cpf_key" ON "clients"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "client_wallets_clientId_key" ON "client_wallets"("clientId");

-- CreateIndex
CREATE INDEX "wallet_transactions_clientId_createdAt_idx" ON "wallet_transactions"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "visits_clientId_idx" ON "visits"("clientId");

-- CreateIndex
CREATE INDEX "visits_tabId_idx" ON "visits"("tabId");

-- CreateIndex
CREATE INDEX "visits_venueObjectId_idx" ON "visits"("venueObjectId");

-- CreateIndex
CREATE INDEX "visits_status_checkInAt_idx" ON "visits"("status", "checkInAt");

-- CreateIndex
CREATE UNIQUE INDEX "tabs_rfid_key" ON "tabs"("rfid");

-- CreateIndex
CREATE UNIQUE INDEX "floor_plans_name_key" ON "floor_plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "venue_objects_qrCodeId_key" ON "venue_objects"("qrCodeId");

-- CreateIndex
CREATE INDEX "venue_objects_floorPlanId_idx" ON "venue_objects"("floorPlanId");

-- CreateIndex
CREATE INDEX "venue_objects_workstationId_idx" ON "venue_objects"("workstationId");

-- CreateIndex
CREATE UNIQUE INDEX "workstations_name_key" ON "workstations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_assignments_userId_venueObjectId_key" ON "staff_assignments"("userId", "venueObjectId");

-- CreateIndex
CREATE UNIQUE INDEX "products_name_key" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_prepStationId_idx" ON "products"("prepStationId");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_productId_key" ON "recipes"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_steps_recipeId_stepNumber_key" ON "recipe_steps"("recipeId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "stock_holdings_ingredientId_idx" ON "stock_holdings"("ingredientId");

-- CreateIndex
CREATE INDEX "stock_holdings_venueObjectId_idx" ON "stock_holdings"("venueObjectId");

-- CreateIndex
CREATE INDEX "stock_holdings_expiryDate_idx" ON "stock_holdings"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "prep_recipes_name_key" ON "prep_recipes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "prep_recipe_inputs_prepRecipeId_ingredientId_key" ON "prep_recipe_inputs"("prepRecipeId", "ingredientId");

-- CreateIndex
CREATE INDEX "prep_tasks_status_idx" ON "prep_tasks"("status");

-- CreateIndex
CREATE INDEX "prep_tasks_assignedToUserId_idx" ON "prep_tasks"("assignedToUserId");

-- CreateIndex
CREATE INDEX "prep_tasks_prepRecipeId_idx" ON "prep_tasks"("prepRecipeId");

-- CreateIndex
CREATE INDEX "prep_tasks_locationId_idx" ON "prep_tasks"("locationId");

-- CreateIndex
CREATE INDEX "orders_visitId_idx" ON "orders"("visitId");

-- CreateIndex
CREATE INDEX "orders_clientId_createdAt_idx" ON "orders"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_workstationId_status_idx" ON "order_items"("workstationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_order_assignments_userId_orderId_role_key" ON "staff_order_assignments"("userId", "orderId", "role");

-- CreateIndex
CREATE INDEX "server_calls_status_createdAt_idx" ON "server_calls"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "entertainers_name_key" ON "entertainers"("name");

-- CreateIndex
CREATE INDEX "scheduled_events_entertainerId_idx" ON "scheduled_events"("entertainerId");

-- CreateIndex
CREATE INDEX "scheduled_events_startTime_endTime_idx" ON "scheduled_events"("startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "vinyl_library_slots_row_column_key" ON "vinyl_library_slots"("row", "column");

-- CreateIndex
CREATE INDEX "vinyl_records_slotId_positionInSlot_idx" ON "vinyl_records"("slotId", "positionInSlot");

-- CreateIndex
CREATE INDEX "vinyl_records_artist_title_idx" ON "vinyl_records"("artist", "title");

-- CreateIndex
CREATE UNIQUE INDEX "dj_sessions_eventId_key" ON "dj_sessions"("eventId");

-- CreateIndex
CREATE INDEX "dj_set_tracks_djSessionId_playedAt_idx" ON "dj_set_tracks"("djSessionId", "playedAt");

-- CreateIndex
CREATE UNIQUE INDEX "buffet_stations_name_key" ON "buffet_stations"("name");

-- CreateIndex
CREATE INDEX "buffet_pans_buffetStationId_idx" ON "buffet_pans"("buffetStationId");

-- CreateIndex
CREATE INDEX "buffet_pans_ingredientId_idx" ON "buffet_pans"("ingredientId");

-- CreateIndex
CREATE INDEX "client_plates_visitId_idx" ON "client_plates"("visitId");

-- CreateIndex
CREATE INDEX "client_plates_clientId_createdAt_idx" ON "client_plates"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "waste_records_createdAt_idx" ON "waste_records"("createdAt");

-- CreateIndex
CREATE INDEX "waste_records_ingredientId_idx" ON "waste_records"("ingredientId");

-- CreateIndex
CREATE INDEX "waste_records_productId_idx" ON "waste_records"("productId");

-- AddForeignKey
ALTER TABLE "client_wallets" ADD CONSTRAINT "client_wallets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "client_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_tabId_fkey" FOREIGN KEY ("tabId") REFERENCES "tabs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_venueObjectId_fkey" FOREIGN KEY ("venueObjectId") REFERENCES "venue_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_objects" ADD CONSTRAINT "venue_objects_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "floor_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venue_objects" ADD CONSTRAINT "venue_objects_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "workstations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_venueObjectId_fkey" FOREIGN KEY ("venueObjectId") REFERENCES "venue_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_prepStationId_fkey" FOREIGN KEY ("prepStationId") REFERENCES "workstations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_steps" ADD CONSTRAINT "recipe_steps_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_holdings" ADD CONSTRAINT "stock_holdings_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_holdings" ADD CONSTRAINT "stock_holdings_venueObjectId_fkey" FOREIGN KEY ("venueObjectId") REFERENCES "venue_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_recipes" ADD CONSTRAINT "prep_recipes_outputIngredientId_fkey" FOREIGN KEY ("outputIngredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_recipe_inputs" ADD CONSTRAINT "prep_recipe_inputs_prepRecipeId_fkey" FOREIGN KEY ("prepRecipeId") REFERENCES "prep_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_recipe_inputs" ADD CONSTRAINT "prep_recipe_inputs_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_prepRecipeId_fkey" FOREIGN KEY ("prepRecipeId") REFERENCES "prep_recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_executedById_fkey" FOREIGN KEY ("executedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prep_tasks" ADD CONSTRAINT "prep_tasks_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "venue_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "workstations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_order_assignments" ADD CONSTRAINT "staff_order_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_order_assignments" ADD CONSTRAINT "staff_order_assignments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_calls" ADD CONSTRAINT "server_calls_venueObjectId_fkey" FOREIGN KEY ("venueObjectId") REFERENCES "venue_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_calls" ADD CONSTRAINT "server_calls_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_calls" ADD CONSTRAINT "server_calls_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_calls" ADD CONSTRAINT "server_calls_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_entertainerId_fkey" FOREIGN KEY ("entertainerId") REFERENCES "entertainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinyl_records" ADD CONSTRAINT "vinyl_records_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "vinyl_library_slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_sessions" ADD CONSTRAINT "dj_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "scheduled_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_set_tracks" ADD CONSTRAINT "dj_set_tracks_djSessionId_fkey" FOREIGN KEY ("djSessionId") REFERENCES "dj_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dj_set_tracks" ADD CONSTRAINT "dj_set_tracks_vinylRecordId_fkey" FOREIGN KEY ("vinylRecordId") REFERENCES "vinyl_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buffet_pans" ADD CONSTRAINT "buffet_pans_buffetStationId_fkey" FOREIGN KEY ("buffetStationId") REFERENCES "buffet_stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buffet_pans" ADD CONSTRAINT "buffet_pans_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_plates" ADD CONSTRAINT "client_plates_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_plates" ADD CONSTRAINT "client_plates_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_plates" ADD CONSTRAINT "client_plates_weighedById_fkey" FOREIGN KEY ("weighedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_records" ADD CONSTRAINT "waste_records_stockHoldingId_fkey" FOREIGN KEY ("stockHoldingId") REFERENCES "stock_holdings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
