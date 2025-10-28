// File: lib/types.ts
import {
    Client, /* Partner, */ Product as PrismaProduct, User, /* StaffCommission, */ Visit ,
    // ---- START FIX ----
    // Removed SeatingArea import
    /* SeatingArea, */ Entertainer, VinylRecord, Prisma, /* ClientStatus */
    // ---- END FIX ----
    ProductType, Workstation, Ingredient, StockHolding as PrismaStockHolding, VenueObject, Order, OrderItem, // Added OrderItem
    // Add new Prisma types
    PrepRecipe as PrismaPrepRecipe,
    PrepRecipeInput as PrismaPrepRecipeInput,
    PrepTask as PrismaPrepTask,
    Role, // Ensure Role is imported if used directly (e.g., in StaffSession)
    ClientWallet, // Added ClientWallet
    WalletTransaction // Added WalletTransaction here for ClientWalletStringBalance
} from "@prisma/client";

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
    success: boolean; data?: T; error?: string; message?: string;
};

// --- STAFF (Now USER) ---
// Type for User with simplified workstation info (if assigned)
export type UserWithWorkstation = User & {
    workstation: Workstation | null;
}

// --- CLIENTS ---
// Types using Order instead of Sale, reflecting API serialization (strings for Decimals)

// Type for OrderItem including its product (with string price)
type OrderItemWithProductStringPrice = Omit<OrderItem, 'unitPrice' | 'totalPrice'> & {
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
    handledBy: { user: { name: string } }[]; // Assuming user always exists
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
type ClientWalletStringBalance = Omit<ClientWallet, 'balance' | 'transactions'> & {
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
export type SerializedIngredientDef = Omit<Ingredient, "costPerUnit"> & {
  costPerUnit: string;
  isPrepared: boolean;
};

// Stock Holding (as returned by API)
export type SerializedStockHolding = Omit<PrismaStockHolding, 'quantity' | 'costAtAcquisition'> & {
    quantity: string;
    costAtAcquisition: string | null;
    ingredient: { name: string; unit: string };
    location: { name: string }; // Use location based on schema relation name
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

// --- PREP RECIPES & TASKS ---
// Prep Recipe Input (as returned by API)
export type SerializedPrepRecipeInput = Omit<PrismaPrepRecipeInput, 'quantity'> & {
    quantity: string;
    ingredient: { id: string; name: string; unit: string };
}

// Prep Recipe Definition (as returned by API)
export type SerializedPrepRecipe = Omit<PrismaPrepRecipe, 'outputQuantity' | 'inputs'> & {
    outputQuantity: string;
    outputIngredient: { id: string; name: string; unit: string };
    inputs: SerializedPrepRecipeInput[];
};

// Prep Task Record (as returned by API)
export type SerializedPrepTask = Omit<PrismaPrepTask, 'quantityRun'> & {
    quantityRun: string;
    prepRecipe: { name: string };
    executedBy: { name: string };
    location: { name: string };
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
    visits: ({ // Info about the active visit in this area
        id: string;
        clientId: string;
        client: { name: string } | null; // Include client name
    })[];
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
    kpis: { totalRevenue: string; totalSales: number; avgSaleValue: string; newClients: number; };
    salesOverTime: { date: string; Revenue: string }[]; // Revenue as string from API
    productLeaderboard: ProductLeaderboardItem[];
};

// Add WalletTransaction if needed (ensure amount is string)
// Moved WalletTransaction import to the top with other Prisma types
export type SerializedWalletTransaction = Omit<WalletTransaction, 'amount'> & {
    amount: string;
};