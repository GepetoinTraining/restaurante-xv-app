// PATH: app/dashboard/weigh-station/page.tsx
"use client";

import { useState } from "react";
import { Container, Stack, Title, Text, Loader, Alert, Button, Group, NumberInput, Paper, Image, Box } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { ApiResponse, SerializedStockHolding } from "@/lib/types"; // Need VisitSelector types
import { notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconCamera, IconScale } from "@tabler/icons-react";
import { VisitSelector } from "@/app/dashboard/pospage/components/VisitSelector"; // Reuse VisitSelector
import { ActiveVisitResponse } from "@/app/api/visits/active/route"; // Type for selected visit
import { formatCurrency } from "@/lib/utils";

// Create a client
const queryClient = new QueryClient();

 // --- Demo Configuration ---
const PLATE_TARE_WEIGHT_GRAMS = 150; // Example tare weight (use number)
const BUFFET_PRICE_PER_KG = 60.00; // Example R$ 60/kg (use number)

// Wrapper for React Query
export default function WeighStationPageWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <WeighStationPage/>
        </QueryClientProvider>
    );
}

// Main page component
function WeighStationPage() {
    const internalQueryClient = useQueryClient();
    const [selectedVisit, setSelectedVisit] = useState<ActiveVisitResponse | null>(null);
    const [totalWeight, setTotalWeight] = useState<number | string>(''); // Input from scale
    const [imageUrl, setImageUrl] = useState<string | null>(null); // Placeholder for image capture

    const netWeight = typeof totalWeight === 'number' && totalWeight > PLATE_TARE_WEIGHT_GRAMS
                       ? totalWeight - PLATE_TARE_WEIGHT_GRAMS
                       : 0;
    const calculatedCost = netWeight > 0 ? (netWeight / 1000) * BUFFET_PRICE_PER_KG : 0;

    // Mutation to record the plate
    const recordPlate = useMutation<ApiResponse, Error, { visitId: string; totalWeightGrams: number; imageUrl?: string | null }>({
         mutationFn: async (data) => {
             const response = await fetch("/api/plates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
             });
             const result: ApiResponse = await response.json();
             if (!response.ok || !result.success) {
                 throw new Error(result.error || "Falha ao registrar prato");
             }
             return result;
         },
         onSuccess: (data) => {
             notifications.show({
                 title: "Prato Registrado",
                 message: `Custo de ${formatCurrency(calculatedCost)} adicionado à visita de ${selectedVisit?.client?.name}.`,
                 color: "green"
             });
             // Reset form
             setSelectedVisit(null);
             setTotalWeight('');
             setImageUrl(null);
             // Invalidate visit queries if necessary (e.g., live data)
             internalQueryClient.invalidateQueries({ queryKey: ['liveData'] }); // Example
             // Maybe invalidate client details if that page shows plate history?
             if (selectedVisit) {
                  internalQueryClient.invalidateQueries({ queryKey: ['clientDetails', selectedVisit.clientId] });
             }
         },
         onError: (error) => {
              notifications.show({ title: "Erro", message: error.message, color: "red" });
         }
    });

    const handleCaptureImage = () => {
        // Placeholder: In a real app, this would trigger camera hardware/API
        setImageUrl(`https://placehold.co/300x200?text=Simulacao+Foto+${Date.now()}`);
        notifications.show({ title: "Simulação", message: "Imagem capturada (simulado).", color: "blue" });
    }

    const handleRecordPlate = () => {
        if (!selectedVisit) {
             notifications.show({ title: "Erro", message: "Selecione a visita do cliente.", color: "orange" });
             return;
        }
         if (typeof totalWeight !== 'number' || totalWeight <= PLATE_TARE_WEIGHT_GRAMS) {
             notifications.show({ title: "Erro", message: `Peso total inválido (deve ser maior que ${PLATE_TARE_WEIGHT_GRAMS}g).`, color: "orange" });
             return;
        }

        recordPlate.mutate({
            visitId: selectedVisit.id,
            totalWeightGrams: totalWeight,
            imageUrl: imageUrl,
        });
    }

    const canRecord = selectedVisit && typeof totalWeight === 'number' && totalWeight > PLATE_TARE_WEIGHT_GRAMS;

    return (
        <Container fluid>
            <Stack gap="lg">
                <PageHeader title="Estação de Pesagem (Buffet)" />

                <Grid gutter="lg">
                    {/* Column 1: Input & Visit Selection */}
                    <Grid.Col span={{ base: 12, md: 6 }}>
                         <Paper withBorder p="md" radius="md">
                             <Stack>
                                 <Title order={4}>Registrar Prato</Title>
                                 {/* Reuse VisitSelector from POS */}
                                  <VisitSelector
                                      selectedVisit={selectedVisit}
                                      onVisitSelect={setSelectedVisit}
                                  />
                                  <NumberInput
                                      required
                                      label="Peso Total da Balança (g)"
                                      placeholder="Ex: 650"
                                      min={0}
                                      step={1}
                                      allowDecimal={false} // Usually scales read integers for grams
                                      value={totalWeight}
                                      onChange={setTotalWeight}
                                      mt="md"
                                      rightSection={<IconScale size={16}/>}
                                  />
                                  <Button
                                      leftSection={<IconCamera size={16}/>}
                                      variant="outline"
                                      onClick={handleCaptureImage}
                                      // disabled // Enable if camera integration is added
                                      mt="sm"
                                  >
                                      Capturar Imagem (Simulado)
                                  </Button>
                             </Stack>
                         </Paper>
                    </Grid.Col>

                     {/* Column 2: Calculation & Confirmation */}
                     <Grid.Col span={{ base: 12, md: 6 }}>
                         <Paper withBorder p="md" radius="md" bg="dark.6">
                              <Stack align="center">
                                  <Title order={4}>Cálculo</Title>
                                  <Group>
                                    <Text>Peso Total:</Text>
                                    <Text fw={500}>{typeof totalWeight === 'number' ? `${totalWeight} g` : '--'}</Text>
                                  </Group>
                                   <Group>
                                    <Text>Peso Prato (Tara):</Text>
                                    <Text fw={500}>{PLATE_TARE_WEIGHT_GRAMS} g</Text>
                                  </Group>
                                  <Group>
                                    <Text>Peso Líquido:</Text>
                                    <Text fw={700} size="lg">{netWeight > 0 ? `${netWeight.toFixed(0)} g` : '--'}</Text>
                                  </Group>
                                   <Group>
                                    <Text>Preço/kg:</Text>
                                    <Text fw={500}>{formatCurrency(BUFFET_PRICE_PER_KG)}</Text>
                                  </Group>
                                  <Box ta="center" mt="md">
                                      <Text>Custo Calculado:</Text>
                                      <Text fw={700} size="xl" c="green.4">{netWeight > 0 ? formatCurrency(calculatedCost) : formatCurrency(0)}</Text>
                                  </Box>

                                  {imageUrl && (
                                       <Image src={imageUrl} maw={200} radius="sm" mt="sm" alt="Foto do Prato"/>
                                  )}

                                  <Button
                                      mt="lg"
                                      size="lg"
                                      color="green"
                                      fullWidth
                                      onClick={handleRecordPlate}
                                      disabled={!canRecord || recordPlate.isPending}
                                      loading={recordPlate.isPending}
                                  >
                                      Registrar Prato e Adicionar à Comanda
                                  </Button>

                              </Stack>
                         </Paper>
                     </Grid.Col>
                </Grid>

            </Stack>
        </Container>
    );
}