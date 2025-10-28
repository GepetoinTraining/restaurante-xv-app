// PATH: app/dashboard/promotions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Stack, Group, Button, LoadingOverlay, Text } from "@mantine/core";
import { PageHeader } from "../components/PageHeader"; // Correct path
import { Plus } from "lucide-react";
import { useDisclosure } from "@mantine/hooks";
import { ApiResponse, Product } from "@/lib/types"; // Use client-side Product
import { notifications } from "@mantine/notifications";
import { CreatePromotionModal } from "./components/CreatePromotionModal";
import { PromotionTable } from "./components/PromotionTable";

// Define placeholder types matching the structure used in the Modal and expected by UI
enum DiscountType {
    PERCENTAGE = "PERCENTAGE",
    FIXED = "FIXED",
}
type Promotion = {
    id: number | string; // Use appropriate ID type
    createdAt?: Date; // Optional placeholder
    expiresAt?: Date; // Add expiresAt based on PromotionTable usage
    title?: string; // Add title based on PromotionTable usage
    body?: string; // Add body based on PromotionTable usage
    bonusOffer?: string; // Add bonusOffer based on PromotionTable usage
    // Add other fields based on expected structure if necessary
    productId: number | string; // Use appropriate type
    discountValue: number;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    discountType: DiscountType; // Use the placeholder enum
    name?: string; // Add name if used elsewhere
};

// Adjust PromotionWithProduct to use the placeholder Promotion type
export type PromotionWithProduct = Promotion & {
    product: Product | null; // Use client-side Product type
};


export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // Use client-side Product
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null); // State to hold API errors
  const [createModal, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

  const fetchData = async () => {
    setLoading(true);
    setApiError(null); // Clear previous errors
    try {
      // Fetch promotions (assuming API returns PromotionWithProduct)
      const promoRes = await fetch("/api/promotions");
      if (promoRes.status === 404) {
          // API route is likely disabled, treat as empty data but show info
          setPromotions([]);
          notifications.show({
              title: "Info",
              message: "A funcionalidade de promoções está desativada.",
              color: "blue",
          });
          // Still try to fetch products
      } else if (!promoRes.ok) {
        // Handle other potential errors fetching promotions
        const errorData = await promoRes.json().catch(() => ({ error: "Falha ao buscar promoções" }));
        throw new Error(errorData.error || "Falha ao buscar promoções");
      } else {
        // Process promotions if API call was successful (and route enabled)
        const promoResult: ApiResponse<PromotionWithProduct[]> = await promoRes.json();
        if (promoResult.success && promoResult.data) {
          setPromotions(promoResult.data);
        } else {
          // If success is false even with 200 OK
          throw new Error(promoResult.error || "Não foi possível carregar promoções");
        }
      }

      // Fetch products (API returns client-side Product)
      const prodRes = await fetch("/api/products");
      if (!prodRes.ok) throw new Error("Falha ao buscar produtos");
      const prodResult: ApiResponse<Product[]> = await prodRes.json();

      if (prodResult.success && prodResult.data) {
        setProducts(prodResult.data);
      } else {
        throw new Error(prodResult.error || "Não foi possível carregar produtos");
      }

    } catch (error: any) {
       setApiError(error.message); // Store error message
      notifications.show({
        title: "Erro ao Carregar Dados",
        message: error.message,
        color: "red",
      });
       setPromotions([]); // Clear promotions on error
       setProducts([]); // Clear products on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // This function signature is now consistent with the placeholder type
  const handlePromotionCreated = (newPromotion: PromotionWithProduct) => {
    // Only add if the promotion feature wasn't disabled during creation
    if (!apiError?.includes("desativada")) {
        setPromotions(current => [...current, newPromotion]);
    }
    // Optionally refetch all data for consistency, though adding locally might be okay
    // fetchData();
  };

  // ---- START FIX ----
  // Define the action button element
  const createPromotionButton = (
    <Button leftSection={<Plus size={18} />} onClick={openCreateModal}>
        Criar Promoção
    </Button>
  );
  // ---- END FIX ----

  return (
    <>
      <CreatePromotionModal
        opened={createModal}
        onClose={closeCreateModal}
        products={products} // Pass client-side Product[]
        onPromotionCreated={handlePromotionCreated}
      />
      <Stack>
        {/* ---- START FIX ---- */}
        {/* Pass the button via the actionButton prop */}
        <PageHeader title="Promoções" actionButton={createPromotionButton} />
        {/* ---- END FIX ---- */}

         {/* Display general API error if occurred during fetch */}
         {apiError && !loading && (
             <Text c="red">Erro ao carregar dados: {apiError}</Text>
         )}

        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: "sm", blur: 2 }} />
          {/* PromotionTable expects `expiresAt`, `title`, `body`, `bonusOffer` which are in the placeholder */}
          <PromotionTable promotions={promotions} loading={loading} />
        </div>
      </Stack>
    </>
  );
}