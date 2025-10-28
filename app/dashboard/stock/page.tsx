// PATH: app/dashboard/stock/page.tsx
"use client";

import { Button, Stack, Tabs, Title, Loader, Text, Center, SegmentedControl } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { Box, Package, Plus, MapPin } from "lucide-react";
import { useDisclosure } from "@mantine/hooks";
import { useState, useMemo } from "react"; // Removed useEffect as it's not used directly here
import { ApiResponse, AggregatedIngredientStock, SerializedStockHolding } from "@/lib/types";
import { Ingredient, VenueObject } from "@prisma/client";
import { CurrentStockTable } from "./components/CurrentStockTable";
import { IngredientDefinitionTable } from "./components/IngredientDefinitionTable";
import { AddStockHoldingModal } from "./components/AddStockHoldingModal";
import { StockHoldingsTable } from "./components/StockHoldingsTable";
import { notifications } from "@mantine/notifications";
// ---- START FIX ----
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
// ---- END FIX ----


// Type for Ingredient Definition from API (using alias for clarity)
type SerializedIngredientDef = Omit<Ingredient, "costPerUnit"> & {
  costPerUnit: string;
  isPrepared: boolean; // Ensure flag is here
};

// Type for VenueObject used as location
type StockLocation = Pick<VenueObject, 'id' | 'name'>;

// Filter type state
type StockFilter = 'ALL' | 'RAW' | 'PREPARED';

// Wrapper for React Query
export default function StockPageWrapper() {
    return (
        <QueryClientProvider client={new QueryClient()}>
            <StockPage/>
        </QueryClientProvider>
    );
}

function StockPage() {
  const queryClient = useQueryClient(); // Get query client instance
  const [addStockModal, { open: openAddStock, close: closeAddStock }] = useDisclosure(false);
  const [selectedIngredient, setSelectedIngredient] = useState<SerializedIngredientDef | null>(null);
  // Locations state removed, data comes directly from useQuery now
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL'); // State for filter

  // --- START FIX: Add queryFn ---
  // Fetch Aggregated Stock
  const {
      data: aggregatedStock,
      isLoading: loadingAggregatedStock,
      refetch: refetchAggregatedStock,
      isError: isAggregatedError,
      error: aggregatedError,
  } = useQuery<AggregatedIngredientStock[]>({
      queryKey: ['aggregatedStock'],
      queryFn: async () => {
          const res = await fetch("/api/ingredients/stock"); // Fetch aggregated stock
          const result: ApiResponse<AggregatedIngredientStock[]> = await res.json();
          if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar estoque agregado");
          return result.data!;
      },
  });

  // Fetch Ingredient Definitions
  const {
      data: ingredientDefs,
      isLoading: loadingDefs,
      refetch: refetchDefs,
      isError: isDefsError,
      error: defsError,
  } = useQuery<SerializedIngredientDef[]>({
      queryKey: ['ingredientDefinitions'],
      queryFn: async () => {
          const res = await fetch("/api/ingredients"); // Fetch ingredient definitions
          const result: ApiResponse<SerializedIngredientDef[]> = await res.json();
          if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar definições de ingredientes");
          return result.data!;
      }
  });

   // Fetch Stock Locations
    const { data: locations, isLoading: loadingLocations, isError: isLocationsError, error: locationsError } = useQuery<StockLocation[]>({
        queryKey: ['stockLocations'],
        queryFn: async () => {
            const res = await fetch("/api/venue-objects"); // Needs filtering or dedicated endpoint
            const result: ApiResponse<VenueObject[]> = await res.json();
            if (result.success && result.data) {
                const storageTypes: VenueObject['type'][] = ['STORAGE', 'FREEZER', 'SHELF', 'WORKSTATION_STORAGE'];
                return result.data
                    .filter(vo => storageTypes.includes(vo.type))
                    .map(vo => ({ id: vo.id, name: vo.name }));
            }
            throw new Error(result.error || "Falha ao buscar locais de estoque");
        },
        staleTime: 5 * 60 * 1000, // Cache locations for 5 mins
    });
  // --- END FIX ---

  // Memoize filtered aggregated stock
  const filteredAggregatedStock = useMemo(() => {
    if (!aggregatedStock) return [];
    if (stockFilter === 'ALL') return aggregatedStock;
    const filterPrepared = stockFilter === 'PREPARED';
    return aggregatedStock.filter(item => item.isPrepared === filterPrepared);
  }, [aggregatedStock, stockFilter]);


  // --- START FIX: Implement handler logic ---
  const handleOpenAddStock = (ingredient: SerializedIngredientDef) => {
    setSelectedIngredient(ingredient);
    openAddStock();
  };

  // Handler for adding stock from aggregated view
  const handleOpenAddStockFromAggregated = (aggItem: AggregatedIngredientStock) => {
      // Find the full definition matching the aggregated item's ID
      const ingredientDef = ingredientDefs?.find(def => def.id === aggItem.ingredientId);
      if (ingredientDef) {
          handleOpenAddStock(ingredientDef);
      } else {
          notifications.show({
              title: "Erro",
              message: `Não foi possível encontrar a definição para ${aggItem.name}`,
              color: "red",
          });
      }
  }


  const handleSuccess = () => {
    closeAddStock();
    setSelectedIngredient(null);
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
    queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
  };
  // --- END FIX ---

  const isLoading = loadingAggregatedStock || loadingDefs || loadingLocations;
  const isError = isAggregatedError || isDefsError || isLocationsError;
  const error = aggregatedError || defsError || locationsError;


  return (
    <>
       {selectedIngredient && (
        <AddStockHoldingModal
          opened={addStockModal}
          onClose={closeAddStock}
          onSuccess={handleSuccess}
          ingredient={selectedIngredient}
          locations={locations ?? []} // Pass fetched locations
        />
      )}

      <Stack>
        <PageHeader title="Gerenciamento de Estoque" />

        <Tabs defaultValue="aggregated" color="blue">
          <Tabs.List>
            <Tabs.Tab value="aggregated" leftSection={<Box size={16} />}>
              Estoque Agregado
            </Tabs.Tab>
             <Tabs.Tab value="holdings" leftSection={<MapPin size={16} />}>
              Lotes por Localização
            </Tabs.Tab>
            <Tabs.Tab value="definitions" leftSection={<Package size={16} />}>
              Definições de Ingredientes
            </Tabs.Tab>
          </Tabs.List>

            {/* General Loading/Error Display */}
            {isLoading && <Center h={200}><Loader /></Center>}
            {isError && !isLoading && <Text c="red" p="md">Erro ao carregar dados: {(error as Error)?.message}</Text>}

          {/* Aggregated Stock Tab */}
          <Tabs.Panel value="aggregated" pt="md">
             {/* Filter Control */}
             <SegmentedControl
                mb="md"
                value={stockFilter}
                onChange={(value) => setStockFilter(value as StockFilter)}
                data={[
                    { label: 'Todos', value: 'ALL' },
                    { label: 'Matéria Prima', value: 'RAW' },
                    { label: 'Preparados', value: 'PREPARED' },
                ]}
              />
            <CurrentStockTable
              stockLevels={filteredAggregatedStock} // Pass filtered data
              // Show loading specific to this table's data source
              loading={loadingAggregatedStock}
              // Pass the correct handler
              onAddStockClick={handleOpenAddStockFromAggregated}
            />
          </Tabs.Panel>

          {/* Stock Holdings Tab */}
          <Tabs.Panel value="holdings" pt="md">
              <StockHoldingsTable
                  ingredientDefs={ingredientDefs ?? []}
                  locations={locations ?? []}
                  onAddStockClick={handleOpenAddStock} // Pass the standard handler here
                  // Pass filter state if filtering needed here too
                  // initialFilter={stockFilter} // Example: sync filter state
              />
          </Tabs.Panel>

          {/* Definitions Tab */}
          <Tabs.Panel value="definitions" pt="md">
            <IngredientDefinitionTable
              items={ingredientDefs ?? []} // Pass full definitions
              loading={loadingDefs}
              onAddStockClick={handleOpenAddStock} // Pass the standard handler
            />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </>
  );
}