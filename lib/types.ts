// PATH: lib/types.ts
import {
  Client,
  /* Partner, */ PrismaProduct,
  User,
  /* StaffCommission, */ Visit,
  // ---- START FIX ----
  // Removed SeatingArea import
  /* SeatingArea, */ Prisma,
  /* ClientStatus */
  // ---- END FIX ----
  ProductType,
  Workstation,
  Ingredient,
  StockHolding as PrismaStockHolding,
  VenueObject,
  Order,
  OrderItem, // Added OrderItem
  // Add new Prisma types
  PrepRecipe as PrismaPrepRecipe,
  PrepRecipeInput as PrismaPrepRecipeInput,
  PrepTask as PrismaPrepTask,
  Role, // Ensure Role is imported if used directly (e.g., in StaffSession)
  ClientWallet, // Added ClientWallet
  WalletTransaction, // Added WalletTransaction here for ClientWalletStringBalance
  VenueObjectType, // Added VenueObjectType
  PrepTaskStatus,
  servingPan,
  BuffetStation,
  CompanyClient,
  Delivery,
  PanShipment,
  ServingPan,
  ServingPanModel,
  // Delivery, // Duplicate import removed
  Route,
  RouteStop,
  Vehicle,
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
} from '@prisma/client';

// --- Client-side Product type with string prices ---
// Type representing Product after Decimal fields are converted to strings FOR API RESPONSE
export type Product = Omit<PrismaProduct, 'price'> & {
  price: string; // Price is a string from the API
  prepStation: Workstation; // Include prep station
};

// --- Cart Item for POS page (Receives Product with string prices from API) ---
export type CartItem = {
  product: Product; // Uses the Product type with string price
  quantity: number;
};

// --- SESSION & AUTH TYPES ---
// Updated to use User model fields
export type StaffSession = {
  id: string; // User ID is string (cuid)
  name: string;
  role: Role; // Use Role enum
  isLoggedIn: boolean;
};

// --- API RESPONSE ---
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// --- FIX: Add the missing ErrorResponse type definition ---
export type ErrorResponse = {
  error: string;
};
// --------------------------------------------------------

// --- STAFF (Now USER) ---
// Type for User with simplified workstation info (if assigned)
export type UserWithWorkstation = User & {
  workstation: Workstation | null;
};

// --- CLIENTS ---
// Types using Order instead of Sale, reflecting API serialization (strings for Decimals)

// Type for OrderItem including its product (with string price)
type OrderItemWithProductStringPrice = Omit<
  OrderItem,
  'unitPrice' | 'totalPrice'
> & {
  unitPrice: string;
  totalPrice: string;
  // Ensure product is defined correctly, including its string price
  product: Omit<PrismaProduct, 'price'> & { price: string };
};

// Type for Order including items and handler (with string total)
type OrderWithItemsAndHandler = Omit<Order, 'total'> & {
  total: string;
  items: OrderItemWithProductStringPrice[];
  // Make handledBy structure more specific based on API response
  handledBy: { user: { id: string; name: string } }[]; // Added ID
};

// Type for Visit including orders and venueObject (with string totalSpent)
export type VisitWithOrdersAndVenueObject = Omit<Visit, 'totalSpent'> & {
  totalSpent: string;
  orders: OrderWithItemsAndHandler[];
  venueObject: VenueObject | null; // Include the venue object relation
};
// Alias for consistency if other components still use the old name
export type VisitWithOrdersAndArea = VisitWithOrdersAndVenueObject;
// Alias used by ClientVisitHistory before correction
export type VisitWithSalesAndArea = VisitWithOrdersAndVenueObject;

// Type for ClientWallet (with string balance)
type ClientWalletStringBalance = Omit<
  ClientWallet,
  'balance' | 'transactions'
> & {
  balance: string;
  // Define transaction type more precisely based on API response for Client Details
  transactions?: (Omit<WalletTransaction, 'amount'> & { amount: string })[]; // Assuming amount is serialized
};

// Updated ClientDetails type using the refined nested types
export type ClientDetails = Client & {
  wallet: ClientWalletStringBalance | null;
  visits: VisitWithOrdersAndVenueObject[];
  // _count might not be returned by the API route, make optional or remove if not needed
  // _count?: { visits: number };
};
// Alias for consistency if used elsewhere
export type ClientWithDetails = ClientDetails;

// --- INVENTORY ---
// Ingredient Definition (as returned by API)
export type SerializedIngredientDef = Omit<Ingredient, 'costPerUnit'> & {
  costPerUnit: string;
  isPrepared: boolean;
};

// Stock Holding (as returned by API)
export type SerializedStockHolding = Omit<
  PrismaStockHolding,
  'quantity' | 'costAtAcquisition'
> & {
  quantity: string;
  costAtAcquisition: string | null;
  ingredient: { id: string; name: string; unit: string }; // Added ID
  location: { id: string; name: string }; // Added ID
};

// Aggregated Stock (as returned by API)
export type AggregatedIngredientStock = {
  ingredientId: string;
  name: string;
  unit: string;
  costPerUnit: string; // Average cost
  totalStock: string;
  isPrepared: boolean; // Ensure this is included
};

// --- Storage Location (as returned by API) ---
export type StorageLocation = Pick<VenueObject, 'id' | 'name' | 'type'>;

// --- PREP RECIPES & TASKS ---
// Prep Recipe Input (as returned by API)
export type SerializedPrepRecipeInput = Omit<
  PrismaPrepRecipeInput,
  'quantity'
> & {
  quantity: string;
  ingredient: { id: string; name: string; unit: string };
};

// Prep Recipe Definition (as returned by API)
export type SerializedPrepRecipe = Omit<
  PrismaPrepRecipe,
  'outputQuantity' | 'inputs'
> & {
  outputQuantity: string; // Stringified Decimal
  estimatedLaborTime: number | null; // Keep as number or null
  outputIngredient: { id: string; name: string; unit: string };
  inputs: SerializedPrepRecipeInput[];
};

// Prep Task Record (as returned by API, more detailed for workflow)
// ---- START FIX: Omit Date fields before re-defining as string ----
export type SerializedPrepTask = Omit<
  PrismaPrepTask,
  | 'quantityRun'
  | 'targetQuantity'
  | 'createdAt'
  | 'assignedAt'
  | 'startedAt'
  | 'completedAt'
> & {
  // ---- END FIX ----
  quantityRun: string | null; // Stringified Decimal or null if not completed
  targetQuantity: string; // Stringified Decimal
  prepRecipe: {
    id: string;
    name: string;
    outputIngredient: { name: string; unit: string } | null; // Match include
    estimatedLaborTime: number | null;
    // ---- START FIX: Add missing property ----
    outputQuantity: string;
    // ---- END FIX ----
  };
  assignedTo: { id: string; name: string } | null;
  executedBy: { id: string; name: string } | null;
  location: { id: string; name: string };
  // Timestamps are now correctly typed as string
  createdAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  // Status enum
  status: PrepTaskStatus;
};

// --- LIVE DATA ---
// Update Live Client types to use string IDs and VenueObject reference
export type LiveClient = {
  visitId: string; // Visit ID
  clientId: string; // Client ID
  name: string; // Client Name
  venueObjectId?: string | null; // ID of the VenueObject where the visit is associated
  seatingAreaName?: string | null; // Name of the VenueObject (legacy naming)
  // Add other relevant fields if needed, e.g., checkInTime
};

// ---- START FIX ----
// Type representing VenueObject with active visit info for live map/table
// Use VenueObject and make reservationCost a string to match API serialization
export type SeatingAreaWithVisitInfo = Omit<VenueObject, 'reservationCost'> & {
  reservationCost: string | null; // Use string after serialization in API
  visits: {
    // Info about the active visit in this area
    id: string;
    clientId: string;
    client: { name: string } | null; // Include client name
  }[];
};
// ---- END FIX ----

export type LiveData = {
  clients: LiveClient[];
  products: Product[]; // Uses the client-side Product type
  // Use SeatingAreaWithVisitInfo (representing VenueObject) if needed
  seatingAreas?: SeatingAreaWithVisitInfo[];
};

// --- FINANCIALS ---
// StaffCommission doesn't exist, remove related types
// export type StaffCommissionWithDetails = StaffCommission & { ... };

// --- REPORTS ---
// Update leaderboards to use string IDs
export type ReportStat = { title: string; value: string };
export type SalesDataPoint = { date: string; Revenue: number }; // Keep number for charts

export type ProductLeaderboardItem = {
  productId: string; // Product ID is string
  name: string;
  totalQuantitySold: number | string; // Prisma _sum might return BigInt -> string
};

export type ReportData = {
  kpis: {
    totalRevenue: string;
    totalSales: number;
    avgSaleValue: string;
    newClients: number;
  };
  salesOverTime: { date: string; Revenue: string }[]; // Revenue as string from API
  productLeaderboard: ProductLeaderboardItem[];
};

// Add WalletTransaction if needed (ensure amount is string)
// Moved WalletTransaction import to the top with other Prisma types
export type SerializedWalletTransaction = Omit<WalletTransaction, 'amount'> & {
  amount: string;
};

export type SerializedservingPan = Omit<
  servingPan,
  'currentQuantity' | 'capacity'
> & {
  currentQuantity: string;
  capacity: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
  } | null;
};

export type BuffetStationWithPans = Omit<BuffetStation, 'pans'> & {
  pans: SerializedservingPan[];
};

// Type returned by GET /api/serving-pans/by-identifier/[id]
export type ActivePanShipmentPayload = ServingPan & {
  panModel: ServingPanModel;
  panShipments: (PanShipment & {
    delivery: Delivery & {
      companyClient: CompanyClient;
    };
  })[]; // This array will have 0 or 1 items
};

// Type for the Pan Return mutation
export type PanReturnPayload = {
  inWeightGrams: number;
};

// Type returned by GET /api/deliveries
export type DeliveryWithClient = Delivery & {
  companyClient: Pick<CompanyClient, 'companyName' | 'addressStreet'>;
  driver: Pick<User, 'name'> | null;
  vehicle: Pick<Vehicle, 'model' | 'licensePlate'> | null;
  panShipments: { id: string }[];
  routeStop: { id: string; routeId: string } | null;
};

// Type for a single stop, returned as part of a route
export type RouteStopWithDelivery = RouteStop & {
  delivery: Delivery & {
    companyClient: Pick<CompanyClient, 'id' | 'companyName' | 'addressStreet'>;
  };
};

// Type for the full route object returned by GET /api/routes
export type RouteWithStops = Route & {
  vehicle: Vehicle | null;
  // We'll fetch driver data separately if needed, or join it. For now, it's just driverId.
  stops: RouteStopWithDelivery[];
};

// Type for a simple list of vehicles
export type VehicleList = Pick<Vehicle, 'id' | 'model' | 'licensePlate'>;

// Type for a simple list of staff (e.g., drivers)
export type StaffList = Pick<User, 'id' | 'name' | 'role'>;

// Type for the full PurchaseOrder object
export type PurchaseOrderWithDetails = PurchaseOrder & {
  supplier: Pick<Supplier, 'id' | 'name'>;
  items: (PurchaseOrderItem & {
    ingredient: Pick<Ingredient, 'id' | 'name'>;
  })[];
};

// Type for the Financial Report API response
export type FinancialReport = {
  startDate: string;
  endDate: string;
  summary: {
    totalCosts: number;
    totalPurchaseCosts: number;
    totalWasteCosts: number;
  };
  breakdown: {
    purchaseCosts: number;
    clientReturnWaste: number;
    internalWaste: number;
  };
};

export type SalesPipelineClient = Pick<
  CompanyClient,
  | 'id'
  | 'companyName'
  | 'contactName'
  | 'salesPipelineStage'
  // Add any other fields you want on the card, e.g., 'dealValue' if we add it later
>;