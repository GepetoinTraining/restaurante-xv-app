// PATH: app/dashboard/purchase-orders/page.tsx
"use client";

import { useState } from "react";
import { Button, Container, Stack, Alert } from "@mantine/core";
import { IconPlus, IconAlertCircle } from "@tabler/icons-react";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, SerializedIngredientDef } from "@/lib/types"; // Import Ingredient type for modal
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PurchaseOrder, Supplier } from "@prisma/client"; // Import Prisma types
import { PurchaseOrderTable, SerializedPurchaseOrder } from "./components/PurchaseOrderTable";
import { CreatePurchaseOrderModal } from "./components/CreatePurchaseOrderModal";

// Create a client for react-query
const queryClient = new QueryClient();

// Wrapper Component
export default function PurchaseOrdersPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <PurchaseOrdersPage />
    </QueryClientProvider>
  );
}

// Main Page Component
function PurchaseOrdersPage() {
    const internalQueryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Add state for PO to view/edit later
    // const [poToEdit, setPoToEdit] = useState<SerializedPurchaseOrder | null>(null);

    // Fetch Purchase Orders
    const {
        data: purchaseOrders,
        isLoading: isLoadingPOs,
        isError: isErrorPOs,
        error: errorPOs,
    } = useQuery<SerializedPurchaseOrder[]>({
        queryKey: ['purchaseOrders'],
        queryFn: async () => {
            const res = await fetch("/api/purchase-orders");
            const result: ApiResponse<SerializedPurchaseOrder[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar ordens de compra");
            return result.data ?? [];
        },
    });

    // Fetch Suppliers (needed for create modal)
    const {
        data: suppliers,
        isLoading: isLoadingSuppliers,
    } = useQuery<Supplier[]>({
        queryKey: ['suppliers'],
        queryFn: async () => {
            const res = await fetch("/api/suppliers");
            const result: ApiResponse<Supplier[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar fornecedores");
            return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000 // Cache suppliers for 5 mins
    });

    // Fetch Ingredients (needed for create modal)
    const {
        data: ingredients,
        isLoading: isLoadingIngredients,
    } = useQuery<SerializedIngredientDef[]>({
        queryKey: ['ingredientDefinitions'],
        queryFn: async () => {
            const res = await fetch("/api/ingredients");
            const result: ApiResponse<SerializedIngredientDef[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar ingredientes");
            return result.data ?? [];
        },
        staleTime: 5 * 60 * 1000 // Cache ingredients for 5 mins
    });


    // Create PO Mutation
    const createMutation = useMutation<any, Error, any>({ // Define types more strictly later
        mutationFn: async (newData) => {
            const response = await fetch("/api/purchase-orders", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
            });
            const result: ApiResponse = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Falha ao criar ordem de compra");
            }
            return result.data;
        },
        onSuccess: () => {
            notifications.show({
                title: 'Sucesso!',
                message: 'Ordem de compra criada com sucesso.',
                color: 'green',
            });
            internalQueryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
            setIsModalOpen(false); // Close modal on success
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Erro',
                message: error.message,
                color: 'red',
            });
        },
    });

    // --- Handlers ---
    const handleOpenCreateModal = () => {
        // setPoToEdit(null); // Reset edit state if implemented
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        // setPoToEdit(null);
        setIsModalOpen(false);
    };

     const handleCreatePO = (formData: any) => {
        createMutation.mutate(formData);
    };

    // Placeholder for receive PO action
     const handleReceivePO = (poId: string) => {
         notifications.show({title: "Info", message:`Receive functionality for PO ${poId} not implemented yet.`, color: "blue"});
         // This will later likely open another modal or navigate to a receiving page
     };

     const isLoading = isLoadingPOs || isLoadingSuppliers || isLoadingIngredients;
     const isError = isErrorPOs; // Focus on PO loading error for main page display
     const error = errorPOs;


  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Ordens de Compra (Pedidos)" />
         {isError && (
            <Alert title="Erro ao Carregar Ordens de Compra" color="red" icon={<IconAlertCircle />}>
                {(error as Error)?.message}
            </Alert>
        )}
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={handleOpenCreateModal}
          w={250} // Wider button
          disabled={isLoading || !suppliers || !ingredients} // Disable if dependencies loading
        >
          Nova Ordem de Compra
        </Button>
        <PurchaseOrderTable
          data={purchaseOrders ?? []}
          isLoading={isLoadingPOs || createMutation.status === 'pending'} // Show loading during fetch or create
          onReceive={handleReceivePO}
          // Add onEdit/onDelete later
        />
      </Stack>
      <CreatePurchaseOrderModal
        opened={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreatePO}
        suppliers={suppliers ?? []}
        ingredients={ingredients ?? []}
        isLoading={createMutation.status === 'pending'}
      />
    </Container>
  );
}
