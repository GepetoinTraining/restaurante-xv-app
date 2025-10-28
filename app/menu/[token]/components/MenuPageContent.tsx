// PATH: app/menu/[token]/components/MenuPageContent.tsx
// Refactored Client Component

"use client";

import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Button,
  Group,
  Alert,
  LoadingOverlay,
} from "@mantine/core";
import { Product, Visit } from "@prisma/client"; // Use Prisma types for structure
import { MenuDisplay } from "@/components/MenuDisplay"; // Shared component
import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconAlertCircle } from "@tabler/icons-react";
import { VenueObjectWithWorkstation, SerializedProduct } from "../page"; // Import types from server component
import { ApiResponse } from "@/lib/types";

// Type for the deserialized Product used within this component
type DeserializedProduct = Omit<SerializedProduct, "price"> & {
  price: number; // Price is now a number
};


// Define props the component accepts
interface MenuPageContentProps {
  venueObject: VenueObjectWithWorkstation;
  initialProducts: SerializedProduct[]; // Receive serialized products
}

// Helper to deserialize string price back to number
function deserializeProducts(
  products: SerializedProduct[]
): DeserializedProduct[] {
  return products.map((p) => ({
    ...p,
    price: parseFloat(p.price || "0"), // Convert back to number
  }));
}

export function MenuPageContent({
  venueObject,
  initialProducts,
}: MenuPageContentProps) {
  const [products] = useState<DeserializedProduct[]>(
    deserializeProducts(initialProducts)
  );
  const [loadingCall, setLoadingCall] = useState(false);
  const [loadingAssociation, setLoadingAssociation] = useState(true); // For visit association
  const [associationError, setAssociationError] = useState<string | null>(null);
  const [activeVisitId, setActiveVisitId] = useState<string | null>(null);

  // --- Visit Association Logic ---
  useEffect(() => {
    const associateVisit = async () => {
      setLoadingAssociation(true);
      setAssociationError(null);
      try {
        // !!! CRITICAL ASSUMPTION !!!
        // We assume the tabId (RFID string) is stored in localStorage
        // after a successful check-in on the check-in page.
        const tabId = localStorage.getItem("activeTabId");

        if (!tabId) {
          throw new Error(
            "Nenhum Tab ativo encontrado. Por favor, realize o check-in primeiro."
          );
        }

        const response = await fetch("/api/visits/associate", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tabId: tabId, qrCodeId: venueObject.qrCodeId }),
        });

        const data: ApiResponse<Visit> = await response.json();

        if (!response.ok || !data.success || !data.data) {
          throw new Error(
            data.error || "Falha ao associar sua visita a esta mesa."
          );
        }

        // Successfully associated
        setActiveVisitId(data.data.id);
        notifications.show({
            title: "Localização Registrada",
            message: `Sua visita foi associada a ${venueObject.name}.`,
            color: 'teal'
        })

      } catch (error: any) {
        console.error("Visit association error:", error);
        setAssociationError(error.message);
        notifications.show({
            title: "Erro de Associação",
            message: error.message + " Você pode ver o menu, mas Chamar Garçom não funcionará.",
            color: 'red',
            autoClose: 7000,
        })
      } finally {
        setLoadingAssociation(false);
      }
    };

    associateVisit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueObject.qrCodeId]); // Rerun if QR code changes (though unlikely)

  // --- Call Server Logic ---
  const handleCallServer = async () => {
    if (!activeVisitId || loadingAssociation || associationError) {
        notifications.show({
            title: "Ação Indisponível",
            message: associationError || "Associação da visita ainda pendente ou falhou.",
            color: "orange"
        });
        return;
    }

    setLoadingCall(true);
    try {
        const response = await fetch("/api/server-calls", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCodeId: venueObject.qrCodeId }) // Send QR Code ID
        });

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || "Falha ao chamar o garçom.");
        }

        notifications.show({
            title: "Garçom Chamado",
            message: `Um atendente foi notificado para ir até ${venueObject.name}. Aguarde.`,
            color: "green",
            autoClose: 7000,
        });

    } catch (error: any) {
         notifications.show({
            title: "Erro",
            message: error.message,
            color: "red",
        });
    } finally {
        setLoadingCall(false);
    }
  };

  // --- Render ---
  return (
    <Container size="md" py="xl">
        <LoadingOverlay visible={loadingAssociation} />
      <Stack gap="xl">
        {/* Header Section */}
        <Paper p="lg" radius="md" withBorder>
          <Title order={1} ta="center">
            Acaia Menu
          </Title>
          <Text ta="center" c="dimmed" mt="xs">
            Você está em:{" "}
            <Text component="span" fw={700}>
              {venueObject.name}
            </Text>
          </Text>

           {/* Show error if association failed */}
           {associationError && !loadingAssociation && (
               <Alert title="Erro de Associação" color="red" icon={<IconAlertCircle />} mt="md" radius="md">
                   {associationError} Não será possível chamar o garçom. Tente recarregar a página ou verificar seu check-in.
               </Alert>
           )}

          {/* Call Server Button */}
          <Group justify="center" mt="lg">
            <Button
              leftSection={<IconBellRinging size={18} />}
              onClick={handleCallServer}
              loading={loadingCall}
              variant="light"
              color="blue" // Keep distinct color
              size="md"
              disabled={loadingAssociation || !!associationError} // Disable if loading or error
            >
              Chamar Garçom
            </Button>
          </Group>
        </Paper>

        {/* Pass deserialized products (number prices) to MenuDisplay */}
        <MenuDisplay products={products} />
      </Stack>
    </Container>
  );
}