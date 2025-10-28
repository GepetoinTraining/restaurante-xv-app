// PATH: app/dashboard/invoices/components/InvoiceImportSimulation.tsx
"use client";

import { useState } from "react";
import { Button, Paper, Title, Text, Stack, Code, Alert, LoadingOverlay, ScrollArea } from "@mantine/core";
import { IconDatabaseImport, IconAlertCircle } from "@tabler/icons-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiResponse, SerializedIngredientDef, StorageLocation, SerializedStockHolding } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { SelectStockLocationModal } from "./SelectStockLocationModal"; // Import the modal

// --- Hardcoded Demo Invoice Data ---
const demoInvoice = {
  supplierName: "Fornecedor Exemplo Ltda.",
  invoiceNumber: "INV-SIM-001",
  invoiceDate: new Date().toISOString().split('T')[0], // Today's date
  items: [
    { itemName: "Cebola Pera", quantity: 5000, unit: "g", costPerUnit: 0.008, expiryDate: null }, // R$ 8/kg
    { itemName: "Tomate Italiano", quantity: 3000, unit: "g", costPerUnit: 0.012, expiryDate: null }, // R$ 12/kg
    { itemName: "Vodka Absolut", quantity: 6, unit: "unidade", costPerUnit: 65.00, expiryDate: null },
    { itemName: "Limão Siciliano", quantity: 20, unit: "unidade", costPerUnit: 1.50, expiryDate: null },
    { itemName: "Item Nao Existe", quantity: 10, unit: "kg", costPerUnit: 5.00, expiryDate: null }, // To test matching failure
  ],
};

// Type for matched/unmatched items during processing
type ProcessedInvoiceItem = typeof demoInvoice.items[0] & {
    matchedIngredient: SerializedIngredientDef | null;
    status: 'matched' | 'unmatched' | 'processed' | 'error';
    errorMessage?: string;
};

export function InvoiceImportSimulation() {
    const queryClient = useQueryClient();
    const [processedItems, setProcessedItems] = useState<ProcessedInvoiceItem[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [locationModalOpened, setLocationModalOpened] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
    const [processingError, setProcessingError] = useState<string | null>(null);

    // Fetch ingredients for matching
    const { data: ingredients, isLoading: isLoadingIngredients } = useQuery<SerializedIngredientDef[]>({
        queryKey: ['ingredientDefinitions'],
        queryFn: async () => {
            const res = await fetch("/api/ingredients");
            const result: ApiResponse<SerializedIngredientDef[]> = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar ingredientes");
            return result.data ?? [];
        },
    });

     // Fetch storage locations for the modal
    const { data: locations, isLoading: isLoadingLocations } = useQuery<StorageLocation[]>({
        queryKey: ['storageLocations'],
        queryFn: async () => {
            const res = await fetch("/api/storage-locations");
            const result: ApiResponse<StorageLocation[]> = await res.json();
            if (result.success && result.data) return result.data;
            throw new Error(result.error || "Falha ao buscar locais de estoque");
        },
    });

    // Mutation to add stock holding
    const addStockHolding = useMutation<
        ApiResponse<SerializedStockHolding>, // Success response type
        Error, // Error type
        { item: ProcessedInvoiceItem; locationId: string } // Variables type
    >({
        mutationFn: async ({ item, locationId }) => {
            if (!item.matchedIngredient) throw new Error("Item sem ingrediente correspondente.");

            const payload = {
                ingredientId: item.matchedIngredient.id,
                venueObjectId: locationId,
                quantity: item.quantity.toString(),
                // Use ingredient's current cost as default if invoice doesn't provide costAtAcquisition specifically
                // Or ideally, the invoice *should* provide the cost paid for *this batch*
                costAtAcquisition: item.costPerUnit.toString(), // Using invoice cost here
                purchaseDate: demoInvoice.invoiceDate, // Use invoice date
                expiryDate: item.expiryDate,
            };
             const response = await fetch("/api/stock-holdings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
             });
             const result: ApiResponse<SerializedStockHolding> = await response.json();
             if (!response.ok || !result.success) {
                 throw new Error(result.error || `Falha ao adicionar lote para ${item.itemName}`);
             }
             return result;
        },
        // Note: onSuccess/onError handled within the processInvoice function
    });


    // --- Simulation Logic ---
    const handleSimulate = async () => {
        if (!ingredients || !locations) {
            notifications.show({ title: "Erro", message: "Ingredientes ou locais não carregados.", color: "red" });
            return;
        }
        setIsProcessing(true);
        setProcessingError(null);
        setLocationModalOpened(true); // Open location modal first
        setSelectedLocationId(null); // Reset location selection

        // 1. Match invoice items to ingredients (simple name matching for demo)
        const initialProcessed: ProcessedInvoiceItem[] = demoInvoice.items.map(item => {
            // Basic matching (case-insensitive) - improve this in a real scenario
            const matched = ingredients.find(ing => ing.name.toLowerCase() === item.itemName.toLowerCase());
            return {
                ...item,
                matchedIngredient: matched || null,
                status: matched ? 'matched' : 'unmatched',
            };
        });
        setProcessedItems(initialProcessed);
        // Don't stop processing yet, wait for location selection
        // setIsProcessing(false); // Moved to after modal closes
    };

    // --- Process after location is selected ---
    const processInvoiceItems = async (locationId: string) => {
         setIsProcessing(true); // Ensure processing state is true
         setProcessingError(null);
         let overallSuccess = true;

         const itemsToProcess = processedItems.filter(item => item.status === 'matched');

         for (const item of itemsToProcess) {
              try {
                   await addStockHolding.mutateAsync({ item, locationId });
                   // Update status locally on success
                   setProcessedItems(prev => prev.map(p => p.itemName === item.itemName ? { ...p, status: 'processed' } : p));
              } catch (error: any) {
                  overallSuccess = false;
                  setProcessingError((prevError) => (prevError ? prevError + "\n" : "") + error.message);
                  // Update status locally on error
                  setProcessedItems(prev => prev.map(p => p.itemName === item.itemName ? { ...p, status: 'error', errorMessage: error.message } : p));
                   notifications.show({ title: 'Erro ao Processar Item', message: `${item.itemName}: ${error.message}`, color: 'red' });
              }
         }

         setIsProcessing(false); // Processing finished

         if(overallSuccess && !processingError) {
             notifications.show({ title: 'Sucesso', message: 'Itens da nota processados e adicionados ao estoque!', color: 'green' });
         } else {
              notifications.show({ title: 'Processamento Parcial', message: 'Alguns itens falharam. Verifique os detalhes.', color: 'orange' });
         }

         // Invalidate relevant queries
         queryClient.invalidateQueries({ queryKey: ['stockHoldings'] });
         queryClient.invalidateQueries({ queryKey: ['aggregatedStock'] });
    }

    const handleLocationSelected = (locationId: string | null) => {
        setLocationModalOpened(false);
        if(locationId) {
            setSelectedLocationId(locationId);
            // Now process the matched items with the selected location
            processInvoiceItems(locationId);
        } else {
             notifications.show({ title: 'Cancelado', message: 'Seleção de local cancelada. Nenhum item adicionado ao estoque.', color: 'yellow' });
             setIsProcessing(false); // Stop processing if modal is cancelled
        }
    }

    const isLoading = isProcessing || isLoadingIngredients || isLoadingLocations;

    return (
        <>
            <Paper withBorder p="md" radius="md" pos="relative">
                <LoadingOverlay visible={isLoading} overlayProps={{ blur: 1, radius: 'sm' }}/>
                <Stack>
                    <Title order={4}>Simulação de Importação</Title>
                    <Text size="sm">Clique no botão para simular o processamento da nota fiscal abaixo.</Text>

                    <Paper bg="dark.8" p="sm" radius="sm">
                         <Text size="sm" fw={500} mb="xs">Nota Fiscal (Exemplo): {demoInvoice.invoiceNumber}</Text>
                         <Code block style={{ whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                             {JSON.stringify(demoInvoice, null, 2)}
                        </Code>
                    </Paper>

                    <Button
                        leftSection={<IconDatabaseImport size={18} />}
                        onClick={handleSimulate}
                        disabled={isLoading}
                    >
                        Simular Recebimento e Processamento
                    </Button>

                    {/* Display Processing Results */}
                    {processedItems.length > 0 && !isProcessing && (
                        <Stack mt="md">
                            <Title order={5}>Resultado do Processamento:</Title>
                            {processingError && (
                                 <Alert title="Erros Gerais" color="red" icon={<IconAlertCircle />}>
                                     <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{processingError}</pre>
                                 </Alert>
                            )}
                            <ScrollArea.Autosize mah={300}>
                                {processedItems.map((item, index) => (
                                    <Paper key={index} p="xs" mt="xs" withBorder radius="sm" bg={
                                        item.status === 'processed' ? 'dark.6' :
                                        item.status === 'unmatched' ? 'dark.5' :
                                        item.status === 'error' ? 'red.9' : 'dark.7'
                                    }>
                                        <Text size="sm" fw={500}>{item.itemName} ({item.quantity} {item.unit})</Text>
                                        {item.status === 'matched' && <Text size="xs" c="dimmed">Aguardando local...</Text>}
                                        {item.status === 'unmatched' && <Text size="xs" c="yellow">Ingrediente não encontrado no sistema.</Text>}
                                        {item.status === 'processed' && <Text size="xs" c="green">Adicionado ao estoque em {locations?.find(l=>l.id === selectedLocationId)?.name}.</Text>}
                                        {item.status === 'error' && <Text size="xs" c="white">Erro: {item.errorMessage || 'Falha desconhecida'}</Text>}
                                    </Paper>
                                ))}
                             </ScrollArea.Autosize>
                        </Stack>
                    )}
                </Stack>
            </Paper>

            {/* Location Selection Modal */}
            <SelectStockLocationModal
                opened={locationModalOpened && !isProcessing} // Only open if not actively processing items
                onClose={() => handleLocationSelected(null)} // Handle close as cancellation
                onSelect={handleLocationSelected}
                locations={locations ?? []}
                itemCount={processedItems.filter(item => item.status === 'matched').length}
            />
        </>
    );
}