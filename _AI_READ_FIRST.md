# AI Protocol: B2B Catering MVP (restaurante-xv-app)

**READ THIS BEFORE ANALYZING OR MODIFYING CODE.**

**Date:** 2025-10-29

**Objective:** This document provides the essential operational context, technical guidelines, and strategic goals for the B2B Catering MVP project (`restaurante-xv-app`). Adherence to these instructions ensures consistency, maintainability, and alignment with the project's purpose.

---

## 1. Project Goal & Core Concept

[cite_start]**Primary Goal:** Develop and validate an end-to-end operational flow for a B2B food catering service[cite: 578, 580, 714, 774].

[cite_start]**Core Concept:** The application acts as a central system managing B2B client relationships, menu planning, automated production/preparation task generation based on daily needs, delivery logistics (including routing and physical asset tracking via serving pans), waste calculation based on returned food weight, and foundational financial reporting (costs vs. waste)[cite: 436, 580, 775]. [cite_start]It aims to provide accurate, fast insights into client consumption patterns and operational efficiency[cite: 436].

**Focus:** The MVP prioritizes the **B2B catering workflow**. [cite_start]Legacy features related to individual clients, POS, table management, etc., while present in the codebase/schema, are largely disconnected from this primary B2B flow and should be treated as secondary unless explicitly requested[cite: 591, 728].

---

## 2. Technical Stack & Architecture

* [cite_start]**Framework:** Next.js (App Router) [cite: 600, 737]
* [cite_start]**Database ORM:** Prisma [cite: 601, 738]
* **Database:** PostgreSQL
* [cite_start]**UI Library:** Mantine UI [cite: 602, 739]
* [cite_start]**State/Data Fetching:** TanStack React Query (@tanstack/react-query) [cite: 603, 740]
* [cite_start]**Language:** TypeScript [cite: 604, 741]
* [cite_start]**Authentication:** `iron-session` with PIN-based login [cite: 579]
* **Styling:** Mantine's built-in styling, CSS Modules (where applicable).

---

## 3. Key Operational Phases & Functionality (MVP)

The project development is structured in phases. [cite_start]As of 2025-10-28, Phases 1-6 are considered code-complete[cite: 582, 719, 768].

[cite_start]**Phase 1: Core Data & Financial Setup** [cite: 440-470, 716]
    * [cite_start]**Models:** `User` (with roles like `FINANCIAL`, `SALES`, `DRIVER`), `CompanyClient`, `Ingredient`, `Recipe`, `Menu`, `ServingPanModel`, `ServingPan`, `Vehicle`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `StockHolding` [cite: 442-454, 725-727].
    * **Functionality:** Basic CRUD for core entities. [cite_start]Entering Purchase Orders links costs to initial `StockHolding`[cite: 457, 469]. [cite_start]Ingredient costs are averaged upon PO receipt[cite: 458].
    * [cite_start]**Frontend:** Management pages for Clients, Ingredients, Recipes, Menus, Pans, Vehicles, Suppliers, POs [cite: 459-468].

[cite_start]**Phase 2: Core Workflow (Menu Assign, Prep, Dispatch)** [cite: 471-493, 718]
    * [cite_start]**Models:** `DailyMenuAssignment`, `PrepRecipe`, `PrepTask`, `Delivery`, `PanShipment` [cite: 473-478]. [cite_start]`StockHolding` and `Ingredient` costs updated [cite: 479-480].
    * [cite_start]**Functionality:** Assigning Menus to Clients generates `DailyMenuAssignment`[cite: 482]. [cite_start]System generates `PrepTasks` based on assignments, client headcount, and consumption factors[cite: 483]. [cite_start]PrepTask lifecycle (Pending -> Assigned -> In Progress -> Completed) managed via API, with stock deduction/addition and cost recalculation on completion [cite: 484-485]. [cite_start]`Delivery` records created[cite: 486]. [cite_start]`PanShipment` logs which `ServingPan` (containing a `Recipe`) goes out with a `Delivery`, recording outbound weight/time[cite: 487]. [cite_start]`ServingPan` status updated[cite: 487].
    * [cite_start]**Frontend:** UI for Daily Menu Assignment, Prep Management (`WorkflowCard`), Delivery Dispatch (including Pan Shipment logging) [cite: 488-492].

[cite_start]**Phase 3: Pan Return & Waste Calculation** [cite: 494-514, 631-651, 742-752]
    * [cite_start]**Models:** `PanShipment` (updated), `Delivery` (updated), `ServingPan` (updated), `WasteRecord` (created), `DailyConsumptionRecord` (created/updated) [cite: 496-501, 633-638, 744].
    * [cite_start]**Functionality:** API endpoint (`PATCH /api/pan-shipments/[id]/return`) records return timestamp and weight[cite: 503, 640, 744, 757]. [cite_start]Calculates waste (`calculatedWasteGrams`) based on out-weight, in-weight, and `ServingPanModel.tareWeightG`[cite: 503, 640, 747]. [cite_start]Updates `ServingPan` status[cite: 505, 642, 748]. [cite_start]Optionally creates linked `WasteRecord`[cite: 506, 643, 750]. [cite_start]Updates `Delivery` status when all its pans return[cite: 504, 641, 749]. [cite_start]API endpoint (`POST /api/daily-consumption-records`) aggregates daily `deliveredConsumptionKg` and `actualConsumptionKg` (delivered - waste)[cite: 507, 644, 752].
    * [cite_start]**Frontend:** Pan Return UI (select/scan pan, input weight, display waste) [cite: 509, 646, 754-758]. [cite_start]Basic waste reporting views[cite: 511, 648]. [cite_start]`DailyConsumptionRecord` view[cite: 512, 649, 760].

[cite_start]**Phase 4: Logistics & Routing (MVP)** [cite: 515-536, 652-673, 752]
    * [cite_start]**Models:** `Route`, `RouteStop`, `Vehicle`, `StaffAssignment`, `Delivery` (updated) [cite: 517-522, 654-659].
    * [cite_start]**Functionality:** CRUD for `Route`[cite: 524, 661]. [cite_start]Add/Remove/Reorder `RouteStop` (linking `CompanyClient` location via `Delivery`)[cite: 525, 662]. [cite_start]Assign `User` (Driver) and `Vehicle` to `Route`[cite: 526, 663]. [cite_start]Update `Route` status[cite: 528, 665].
    * [cite_start]**Frontend:** UI for Route creation/viewing, assigning Driver/Vehicle [cite: 668-669]. [cite_start]Drag-and-drop interface to add Deliveries as RouteStops[cite: 670]. (Map view mentioned but might be future) [cite_start][cite: 671]. [cite_start]UI to update Route status[cite: 672].

[cite_start]**Phase 5: Weather & Prediction (V1)** [cite: 537-553, 674-690, 752]
    * [cite_start]**Models:** `DailyConsumptionRecord` (updated), `CompanyClient` (updated) [cite: 539-541, 676-678].
    * [cite_start]**Functionality:** Internal API (`/api/weather`) fetches external weather data[cite: 543, 680]. [cite_start]Logic triggered (e.g., via `POST /api/consumption-prediction`) uses `employeeCount`, `consumptionFactor`, and weather to calculate `predictedConsumptionKg` [cite: 544-545, 681-682]. [cite_start]Prediction and weather stored in `DailyConsumptionRecord`[cite: 546, 683]. [cite_start]After waste calculation (Phase 3), `actualConsumptionKg` and `consumptionVarianceFactor` are calculated and stored [cite: 547-548, 684-685].
    * [cite_start]**Frontend:** Display weather and prediction vs. actual in relevant views [cite: 551-552, 688-689]. [cite_start]Component (`PredictionTrigger`) to manually generate prediction for a client/date[cite: 760].

[cite_start]**Phase 6: Sales Pipeline & Financial Reporting (MVP)** [cite: 554-576, 691-713, 752]
    * [cite_start]**Models:** `CompanyClient` (updated), `PurchaseOrder` (read/update), `PurchaseOrderItem` (read), `PanShipment` (read), `WasteRecord` (read) [cite: 556-557, 693-697].
    * [cite_start]**Functionality:** API (`PATCH /api/company-clients/[id]/sales-stage`) updates client's sales stage[cite: 562, 699]. [cite_start]API (`PATCH /api/purchase-orders/[id]/status`) updates PO status (e.g., to `RECEIVED`)[cite: 563, 700]. [cite_start]Reporting API (`GET /api/reports/costs`) aggregates `PurchaseOrderItem.totalCost` for received POs and `WasteRecord.costValue` for waste costs in a date range [cite: 564-566, 701-703]. (Sales report API `GET /api/reports/sales` also exists).
    * [cite_start]**Frontend:** Sales Pipeline board (`/dashboard/sales-pipeline`) with drag-and-drop for stage updates[cite: 569, 706]. [cite_start]Purchase Order list (`/dashboard/purchase-orders`) with UI to mark as received[cite: 570, 707]. [cite_start]Financials page (`/dashboard/financials`) displaying Purchase Costs vs. Waste Costs from the reports API [cite: 571-573, 708-710].

[cite_start]**Phase 7: Reporting Enhancement (Remaining)** [cite: 432-434]
    * [cite_start]Refine cost reporting (`/api/reports/costs`)[cite: 433].
    * [cite_start]Enhance `/dashboard/reports` UI[cite: 434].

---

## 4. Operational Principles & Context

* **B2B Focus:** Prioritize features supporting the catering workflow for corporate clients.
* **Data Accuracy:** Emphasize correct data entry, especially weights (outbound/inbound pans) and costs (POs), as these drive waste and financial calculations.
* **Workflow Automation:** Leverage automated prep task generation based on menu assignments and client data.
* **Physical Asset Tracking:** `ServingPan` and `PanShipment` models are crucial for tracking physical assets and linking them to deliveries and waste.
* [cite_start]**Prediction Goal:** The system aims to predict consumption accurately based on client profiles, history, and external factors like weather[cite: 436, 766]. [cite_start]V1 prediction is basic [cite: 544-546, 681-683].
* **Costing:** Ingredient costs are averaged based on PO receipts. Prepared item costs are derived from their input ingredient costs during `PrepTask` completion. Waste costs are calculated based on the estimated cost of the wasted item/ingredients.

---

## 5. Coding & Type Safety Protocol (Non-Negotiable)

**Minimize type errors between Client (React Components) and Server (Next.js API Routes).**

* **Principle 1: Prisma Schema is Truth:** Always import types (`Ingredient`, `Product`, etc.) from `@prisma/client`. Never redefine them manually.
* **Principle 2: Centralize API Contracts:** Define types for API request/response bodies (if not direct Prisma models) in `lib/types.ts`. Import these shared types in both client and server code. Use Prisma's `XGetPayload` types for complex queries involving relations (see Principle 6).
* **Principle 3: Validate API Inputs (Zod Recommended):** Use Zod schemas (`lib/types.ts` or route file) to parse and validate `req.json()` results in API routes. Infer TypeScript types from Zod schemas (`z.infer`). Handle Zod validation errors gracefully (e.g., return 400).
* **Principle 4: Type Dynamic Route Params:** In API routes like `/[id]/route.ts`, explicitly type the `params` object: `{ params }: { params: { id: string } }`.
* **Principle 5: Type Client-Side Responses:** When using `fetch` in components, explicitly type the expected JSON response: `const data: ExpectedType = await res.json();`.
* **Principle 6: Use `Prisma.XGetPayload` for Includes:** If an API route returns data with `include` or `select`, use `Prisma.ModelNameGetPayload<{ include: { ... } }>` to generate the exact response type. Import and use this precise type on the client-side.
* **Serialization:** Remember that `Decimal` types from Prisma **must be converted to strings** (`.toString()`) before being sent in `NextResponse.json()`. Client-side code must expect these strings and parse them (`parseFloat`) if numeric operations are needed. Ensure shared types in `lib/types.ts` reflect this serialization (e.g., `price: string`).

---

## 6. Known Challenges & Considerations

* [cite_start]**Error Handling:** Needs further refinement, especially around stock conflicts and edge cases[cite: 625, 762].
* [cite_start]**Performance:** Complex queries might need optimization[cite: 626, 763].
* [cite_start]**Real-time Updates:** Currently requires manual refresh[cite: 627, 764, 853].
* [cite_start]**UX:** Pan scanning/selection flow needs refinement[cite: 628, 765].
* [cite_start]**Stock Depletion (Limitation):** Receiving POs and completing Prep Tasks update cost reports but **do not currently update `StockHolding` quantities** in the MVP [cite: 854-855]. This is a key limitation to be aware of.
* [cite_start]**Waste Costing (Verification):** The `WasteRecord.costValue` calculation logic needs verification [cite: 856-857].

---

**By following these guidelines, you will contribute effectively to the `restaurante-xv-app` project.**