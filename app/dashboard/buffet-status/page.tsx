// PATH: app/dashboard/buffet-status/page.tsx
"use client";

import { useState } from "react";
import { Container, Stack, Title, Text, Loader, Alert, SimpleGrid, Center } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, StorageLocation } from "@/lib/types"; // Import StorageLocation
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle } from "@tabler/icons-react";
import { BuffetStationWithPans } from "@/app/api/buffet/stations/route"; // Import API response type
import { BuffetStationDisplay } from "./components/BuffetStationDisplay"; // Import display component

// Create a client
const queryClient = new QueryClient();

// Wrapper for React Query
export default function BuffetStatusPageWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <BuffetStatusPage/>
        </QueryClientProvider>
    );
}

// Main page component
function BuffetStatusPage() {
    const internalQueryClient = useQueryClient(); // Get client instance

    // Fetch Buffet Stations and Pans
    const {
        data: stations,
        isLoading: isLoadingStations,
        isError,
        error,
        refetch,
    } = useQuery<BuffetStationWithPans[]>({
        queryKey: ['buffetStations'],
        queryFn: async () => {
            const res = await fetch("/api/buffet/stations");
            const result: ApiResponse<BuffetStationWithPans[]> = await res.json();
            if (!res.ok || !result.success) {
                 // Handle specific model not found error gracefully
                 if (result.error?.includes("model")) {
                     notifications.show({ title: "Atenção", message: "Funcionalidade de Buffet não configurada no banco de dados.", color: "orange", autoClose: 7000 });
                     return []; // Return empty array instead of throwing
                 }
                throw new Error(result.error || "Falha ao buscar status do buffet");
            }
            return result.data ?? [];
        },
        refetchInterval: 60000, // Refetch every 60 seconds
        refetchIntervalInBackground: true,
    });

     // Fetch Storage Locations (needed for refill modal)
    const { data: locations, isLoading: isLoadingLocations } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'],
        queryFn: async () => {
            const res = await fetch("/api/storage-locations");
            const result: ApiResponse<StorageLocation[]> = await res.json();
            if (result.success && result.data) return result.data;
            throw new Error(result.error || "Falha ao buscar locais de estoque");
        },
         staleTime: 5 * 60 * 1000, // Cache locations
    });


    const handleRefillSuccess = () => {
        // Refetch station data after successful refill
        internalQueryClient.invalidateQueries({ queryKey: ['buffetStations'] });
         // Also refetch stock as refill deducts from it
        internalQueryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
        internalQueryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
    };

    const isLoading = isLoadingStations || isLoadingLocations;

    return (
        <Container fluid>
            <Stack gap="lg">
                <PageHeader title="Status do Buffet" />
                 <Alert
                    variant="light"
                    color="blue"
                    title="Atualização Automática"
                    icon={<IconAlertCircle />}
                >
                    Esta página atualiza o status das cubas a cada minuto.
                </Alert>

                {isLoading && !stations && <Center h={200}><Loader /></Center>}
                {isError && (
                    <Alert title="Erro ao Carregar Status" color="red" icon={<IconAlertCircle />}>
                        {(error as Error)?.message}
                    </Alert>
                )}

                {!isLoading && stations?.length === 0 && !isError &&(
                    <Text c="dimmed" ta="center" mt="xl">Nenhuma estação de buffet configurada ou encontrada.</Text>
                )}

                {stations && stations.length > 0 && locations && (
                    <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
                        {stations.map(station => (
                            <BuffetStationDisplay
                                key={station.id}
                                station={station}
                                locations={locations}
                                onRefillSuccess={handleRefillSuccess}
                            />
                        ))}
                    </SimpleGrid>
                )}
            </Stack>
        </Container>
    );
}