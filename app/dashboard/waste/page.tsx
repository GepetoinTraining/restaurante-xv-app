// PATH: app/dashboard/waste/page.tsx
"use client";

import { Container, Stack, Title, Text, Loader, Alert } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, StorageLocation, SerializedIngredientDef } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle } from "@tabler/icons-react";
import { RecordWasteForm } from "./components/RecordWasteForm"; // Import the form component

// Create a client
const queryClient = new QueryClient();

// Wrapper for React Query
export default function WastePageWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <WastePage/>
        </QueryClientProvider>
    );
}

// Main page component
function WastePage() {
    const internalQueryClient = useQueryClient(); // Get client instance

    // Fetch Ingredients (for selection in the form)
    const {
        data: ingredients,
        isLoading: isLoadingIngredients,
        isError: isIngredientsError,
        error: ingredientsError,
    } = useQuery<SerializedIngredientDef[]>({
        queryKey: ['ingredientDefinitions'], // Use consistent key
        queryFn: async () => {
            const res = await fetch("/api/ingredients");
            const result: ApiResponse<SerializedIngredientDef[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar ingredientes");
            return result.data ?? [];
        }
    });

    // Fetch Storage Locations (for selection in the form)
    const {
        data: locations,
        isLoading: isLoadingLocations,
        isError: isLocationsError,
        error: locationsError
    } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'],
        queryFn: async () => {
            const res = await fetch("/api/storage-locations");
            const result: ApiResponse<StorageLocation[]> = await res.json();
            if (result.success && result.data) return result.data;
            throw new Error(result.error || "Falha ao buscar locais de estoque");
        },
    });

    const handleWasteRecorded = () => {
        // Invalidate stock queries after recording waste
        internalQueryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
        internalQueryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
        // Optionally invalidate a query for waste records if displaying a history table
        // internalQueryClient.invalidateQueries({ queryKey: ['wasteRecords'] });
    };

    const isLoading = isLoadingIngredients || isLoadingLocations;
    const isError = isIngredientsError || isLocationsError;
    const error = ingredientsError || locationsError;

    return (
        <Container fluid>
            <Stack gap="lg">
                <PageHeader title="Registrar Perda / Desperdício" />

                <Text c="dimmed" size="sm">
                    Use esta seção para registrar ingredientes que foram perdidos por motivos como validade, quebra, contaminação, etc. O estoque será deduzido automaticamente.
                </Text>

                {isLoading && <Loader />}
                {isError && (
                    <Alert title="Erro ao Carregar Dados" color="red" icon={<IconAlertCircle />}>
                        Não foi possível carregar ingredientes ou localizações: {(error as Error)?.message}
                    </Alert>
                )}

                {!isLoading && !isError && ingredients && locations && (
                    <RecordWasteForm
                        ingredients={ingredients}
                        locations={locations}
                        onSuccess={handleWasteRecorded}
                    />
                )}

                {/* Optional: Add a Waste History Table component here */}

            </Stack>
        </Container>
    );
}