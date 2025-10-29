// PATH: app/dashboard/buffet-status/page.tsx
'use client';

import { PageHeader } from "../../../components/ui/PageHeader";
import { ApiResponse, StorageLocation } from "@/lib/types";
import { Alert, Button, Grid, Group, LoadingOverlay, Title } from "@mantine/core";
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle } from "@tabler/icons-react";
import { BuffetStationWithPans } from "@/lib/types"; 
import { BuffetStationDisplay } from "./components/BuffetStationDisplay";

// Create a client
const queryClient = new QueryClient();

// Main component content
function BuffetStatusContent() {
    const queryClient = useQueryClient(); 

    // Query to fetch buffet stations
    const { data: stationsData, isLoading: isLoadingStations, error: stationsError } = useQuery<BuffetStationWithPans[]>({
        queryKey: ['buffetStations'],
        queryFn: () =>
            fetch('/api/buffet').then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch stations");
                return data.data;
            }),
    });

    // Query to fetch storage locations
    const { data: locationsData, isLoading: isLoadingLocations, error: locationsError } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'],
        queryFn: () =>
            fetch('/api/storage-locations').then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch locations");
                return data.data;
            }),
    });

    const isLoading = isLoadingStations || isLoadingLocations;
    const error = stationsError || locationsError;

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['buffetStations'] });
        queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
        queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
    };

    return (
        <>
            {/* ---- START FIX ---- */}
            <PageHeader 
                title="Status do Buffet"
                actionButton={
                    <Button onClick={handleRefresh} variant="light" loading={isLoading}>
                        Atualizar
                    </Button>
                }
            />
            {/* ---- END FIX ---- */}
            
            <div style={{ position: 'relative' }}>
                <LoadingOverlay visible={isLoading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                
                {error && (
                    <Alert 
                        color="red" 
                        title="Erro ao carregar dados" 
                        icon={<IconAlertCircle />} 
                        withCloseButton 
                        onClose={() => queryClient.resetQueries()}
                    >
                        {error instanceof Error ? error.message : "Ocorreu um erro desconhecido."}
                    </Alert>
                )}

                {!isLoading && !error && (
                     <Grid>
                        {stationsData && stationsData.length > 0 ? (
                            stationsData.map(station => (
                                <Grid.Col span={{ base: 12, md: 6, lg: 4 }} key={station.id}>
                                    <BuffetStationDisplay
                                        station={station}
                                        storageLocations={locationsData || []}
                                        onRefresh={handleRefresh}
                                    />
                                </Grid.Col>
                            ))
                        ) : (
                            <Grid.Col span={12}>
                                <Title order={4} c="dimmed" ta="center" mt="xl">
                                    Nenhuma estação de buffet encontrada.
                                </Title>
                            </Grid.Col>
                        )}
                    </Grid>
                )}
            </div>
        </>
    );
}

// Export the page wrapped in the QueryClientProvider
export default function BuffetStatusPage() {
    return (
        <QueryClientProvider client={queryClient}>
            <BuffetStatusContent />
        </QueryClientProvider>
    );
}