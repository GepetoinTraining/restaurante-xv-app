// PATH: app/dashboard/weigh-station/page.tsx
'use client';

import { PageHeader } from "@/app/dashboard/components/PageHeader";
import { ApiResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Alert, Button, Grid, Group, LoadingOverlay, NumberInput, Paper, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconAlertCircle, IconScale } from "@tabler/icons-react";
import dayjs from "dayjs";
import { notifications } from "@mantine/notifications";
// --- REMOVED VisitSelector ---

// Define the shape of the plate data we get from the API
type SimplePlate = {
    id: string;
    createdAt: string;
    netWeightGrams: string;
    calculatedCost: string;
    notes: string | null;
    weighedBy: { name: string };
};

// --- Form Values ---
interface WeighFormValues {
    totalWeightGrams: string;
    tareWeightGrams: string;
    pricePerKg: string;
    notes: string;
}

// --- Recent Plates Table ---
function RecentPlatesTable({ plates, isLoading }: { plates: SimplePlate[] | undefined, isLoading: boolean }) {
    const rows = plates?.map((plate) => (
        <Table.Tr key={plate.id}>
            <Table.Td>{dayjs(plate.createdAt).format('HH:mm:ss')}</Table.Td>
            {/* --- REMOVED Client Column --- */}
            <Table.Td>{parseFloat(plate.netWeightGrams).toFixed(2)} g</Table.Td>
            <Table.Td>{formatCurrency(parseFloat(plate.calculatedCost))}</Table.Td>
            <Table.Td>{plate.weighedBy.name}</Table.Td>
            <Table.Td>{plate.notes}</Table.Td>
        </Table.Tr>
    ));

    return (
        <Paper withBorder p="md" mt="xl" style={{ position: 'relative' }}>
            <LoadingOverlay visible={isLoading} />
            <Title order={4} mb="md">Pratos Recentes</Title>
            <Table.ScrollContainer minWidth={500}>
                <Table striped highlightOnHover verticalSpacing="xs">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Hora</Table.Th>
                            {/* --- REMOVED Client Header --- */}
                            <Table.Th>Peso Líquido</Table.Th>
                            <Table.Th>Custo</Table.Th>
                            <Table.Th>Pesado por</Table.Th>
                            <Table.Th>Notas</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows && rows.length > 0 ? rows : (
                            <Table.Tr>
                                <Table.Td colSpan={5} c="dimmed" ta="center">
                                    Nenhum prato pesado recentemente.
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Table.ScrollContainer>
        </Paper>
    );
}

// --- Main Weigh Station Page ---
export default function WeighStationPage() {
    const queryClient = useQueryClient();
    // --- REMOVED selectedVisitId state ---

    const form = useForm<WeighFormValues>({
        initialValues: {
            totalWeightGrams: '',
            tareWeightGrams: '300', // Default tare
            pricePerKg: '69.90', // Default price
            notes: '',
        },
    });

    // --- Calculate derived values ---
    const totalWeight = parseFloat(form.values.totalWeightGrams) || 0;
    const tareWeight = parseFloat(form.values.tareWeightGrams) || 0;
    const pricePerKg = parseFloat(form.values.pricePerKg) || 0;
    const netWeight = Math.max(0, totalWeight - tareWeight);
    const calculatedCost = (netWeight / 1000) * pricePerKg; // (g / 1000) * price/kg

    // --- Data fetching ---
    const { data: platesData, isLoading: isLoadingPlates } = useQuery<SimplePlate[]>({
        queryKey: ['recentPlates'],
        queryFn: () =>
            fetch('/api/plates').then(res => res.json()).then(data => {
                if (!data.success) throw new Error(data.error || "Failed to fetch plates");
                return data.data;
            }),
        refetchInterval: 10000, // Refetch every 10 seconds
    });

    // --- Data mutation ---
    const mutation = useMutation({
        mutationFn: (newPlate: any) =>
            fetch('/api/plates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPlate),
            }).then(res => res.json().then(data => {
                if (!data.success) throw new Error(data.error || "Failed to save plate");
                return data.data;
            })),
        onSuccess: () => {
            notifications.show({
                title: 'Prato Registrado!',
                message: `Custo: ${formatCurrency(calculatedCost)}`,
                color: 'green',
            });
            form.reset(); // Reset form
            queryClient.invalidateQueries({ queryKey: ['recentPlates'] });
        },
        onError: (error: Error) => {
            notifications.show({
                title: 'Erro ao registrar prato',
                message: error.message,
                color: 'red',
            });
        },
    });

    const handleSubmit = (values: WeighFormValues) => {
        // --- REMOVED Visit Check ---

        if (netWeight <= 0) {
            notifications.show({
                title: 'Peso inválido',
                message: 'Peso líquido deve ser positivo.',
                color: 'orange',
            });
            return;
        }

        mutation.mutate({
            // --- REMOVED visitId ---
            totalWeightGrams: totalWeight,
            tareWeightGrams: tareWeight,
            calculatedCost: calculatedCost,
            notes: values.notes || null,
        });
    };

    return (
        <>
            <PageHeader title="Estação de Pesagem" />
            
            <Grid>
                {/* --- Weighing Form --- */}
                <Grid.Col span={{ base: 12, md: 5 }}>
                    <Paper withBorder shadow="md" p="md">
                        <form onSubmit={form.onSubmit(handleSubmit)}>
                            <Stack>
                                <Title order={3}>Registrar Prato</Title>
                                {/* --- REMOVED VisitSelector --- */}
                                
                                <NumberInput
                                    label="Preço por Kg (R$)"
                                    placeholder="69.90"
                                    decimalScale={2}
                                    fixedDecimalScale
                                    step={1}
                                    {...form.getInputProps('pricePerKg')}
                                />
                                <NumberInput
                                    label="Tara do Prato (g)"
                                    placeholder="300"
                                    decimalScale={2}
                                    step={1}
                                    {...form.getInputProps('tareWeightGrams')}
                                />
                                <NumberInput
                                    label="Peso Total (g)"
                                    placeholder="Insira o peso da balança"
                                    decimalScale={2}
                                    required
                                    {...form.getInputProps('totalWeightGrams')}
                                />
                                <TextInput
                                    label="Notas (Opcional)"
                                    placeholder="Ex: Prato quebrou, teste"
                                    {...form.getInputProps('notes')}
                                />

                                {/* --- Summary --- */}
                                <Paper withBorder p="sm" radius="md" bg="blue.0">
                                    <Stack gap="xs">
                                        <Group justify="space-between">
                                            <Text>Peso Líquido:</Text>
                                            <Text fw={700} size="lg">{netWeight.toFixed(2)} g</Text>
                                        </Group>
                                        <Group justify="space-between">
                                            <Text>Custo Final:</Text>
                                            <Text fw={700} size="lg" c="blue.7">
                                                {formatCurrency(calculatedCost)}
                                            </Text>
                                        </Group>
                                    </Stack>
                                </Paper>

                                <Button
                                    type="submit"
                                    size="lg"
                                    leftSection={<IconScale size={20} />}
                                    loading={mutation.isPending}
                                >
                                    Registrar Prato
                                </Button>
                            </Stack>
                        </form>
                    </Paper>
                </Grid.Col>

                {/* --- Recent Plates --- */}
                <Grid.Col span={{ base: 12, md: 7 }}>
                    <RecentPlatesTable plates={platesData} isLoading={isLoadingPlates} />
                </Grid.Col>
            </Grid>
        </>
    );
}