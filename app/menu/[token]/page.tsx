// PATH: app/menu/[token]/page.tsx
// Refactored Server Component

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Product, VenueObject, Workstation } from "@prisma/client";
import { MenuPageContent } from "./components/MenuPageContent"; // Client component

// Define the type for VenueObject including its workstation relation
export type VenueObjectWithWorkstation = VenueObject & {
  workstation: Workstation | null;
};

// Define the type for Product after serialization
export type SerializedProduct = Omit<Product, "price"> & {
  price: string;
};

// --- Data Fetching Function (Server Side) ---
// Fetches VenueObject based on QR Code and all Products
async function getMenuData(qrCodeId: string): Promise<{
  venueObject: VenueObjectWithWorkstation | null;
  products: SerializedProduct[];
}> {
  const venueObject = await prisma.venueObject.findUnique({
    where: { qrCodeId: qrCodeId },
    include: {
      workstation: true, // Include workstation if it's linked
    },
  });

  let products: SerializedProduct[] = [];
  // Fetch products regardless of whether venueObject exists initially,
  // client component can handle showing products even if association fails.
  const fetchedProducts = await prisma.product.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }], // Simplified sorting
    include: {
        prepStation: true // Need prepStation details if filtering/displaying
    }
  });

  // Serialize Decimal fields TO STRINGS for passing to client component
  products = fetchedProducts.map((p) => ({
    ...p,
    price: p.price.toString(),
  }));

  // Serialize Decimal fields in venueObject if needed (reservationCost)
  const serializedVenueObject = venueObject
    ? {
        ...venueObject,
        reservationCost: venueObject.reservationCost
          ? venueObject.reservationCost.toString()
          : null,
      }
    : null;

  return { venueObject: serializedVenueObject as VenueObjectWithWorkstation | null, products };
}

// --- The Page Component (Server Component Wrapper) ---
export default async function MenuPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params; // Token is the qrCodeId
  const { venueObject, products } = await getMenuData(token);

  if (!venueObject) {
    notFound(); // Triggers 404 page if QR code is invalid
  }

  // Pass venueObject and serialized products to the client component
  return (
    <MenuPageContent venueObject={venueObject} initialProducts={products} />
  );
}

// --- Metadata Generation (Server-side) ---
export async function generateMetadata({
  params,
}: {
  params: { token: string };
}) {
  const venueObject = await prisma.venueObject.findUnique({
    where: { qrCodeId: params.token },
    select: { name: true },
  });
  const title = venueObject
    ? `Menu - ${venueObject.name} | Acaia`
    : "Menu | Acaia";
  return { title };
}