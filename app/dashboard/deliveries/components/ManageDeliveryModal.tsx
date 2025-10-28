// PATH: app/dashboard/deliveries/components/ManageDeliveryModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Stack,
  LoadingOverlay,
  Select,
  Group,
  ActionIcon,
  Text,
  Title,
  ScrollArea,
  TextInput,
  NumberInput, // Import NumberInput
  Paper,
} from "@mantine/core";
import { useForm, zodResolver } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { randomId } from "@mantine/hooks";
import { z } from "zod"; // Import Zod
import { SerializedDeliveryBasic, SerializedCompanyClientBasic, SerializedVehicleBasic, SerializedDriverBasic, SerializedServingPanBasic } from "../page";
import { IconTrash, IconQrcode, IconWeight } from "@tabler/icons-react";
import dayjs from "dayjs";

// Zod schema for validation
const deliverySchema = z.object({
    companyClientId: z.string().min(1, { message: "Cliente é obrigatório" }),
    vehicleId: z.string().nullable(), // Allow null
    driverId: z.string().nullable(), // Allow null
    panShipments: z.array(z.object({
        key: z.string(), // Mantine key
        servingPanId: z.string().min(1, { message: "Pan ID é obrigatório" }),
        recipeGuess: z.string().optional(), // Optional guess
        outWeightGrams: z.string().refine(val => { // Custom validation for positive number as string
            const num = parseFloat(val);
            return !isNaN(num) && num > 0;
        }, { message: "Peso > 0" }),
    })).min(1, { message: "Adicione pelo menos uma panela" }), // Must have at least one pan
});

// Type for form values based on Zod schema
type DeliveryFormValues = z.infer<typeof deliverySchema>;

interface ManageDeliveryModalProps {
    opened: boolean;
    onClose: () => void;
    onSubmit: (values: DeliveryFormValues) => void;
    isLoading: boolean;
    delivery: SerializedDeliveryBasic | null; // For editing later
    companyClients: SerializedCompanyClientBasic[];
    vehicles: SerializedVehicleBasic[];
    drivers: SerializedDriverBasic[];
    availablePans: SerializedServingPanBasic[]; // Pans with status AVAILABLE
}

export function ManageDeliveryModal({
    opened,
    onClose,
    onSubmit,
    isLoading,
    delivery,
    companyClients,
    vehicles,
    drivers,
    availablePans,
}: ManageDeliveryModalProps) {
    const isEditMode = !!delivery; // Currently only supports CREATE mode

    const form = useForm<DeliveryFormValues>({
        initialValues: {
            companyClientId: '',
            vehicleId: null,
            driverId: null,
            panShipments: [],
        },
        validate: zodResolver(deliverySchema), // Use Zod for validation
    });

    // Reset form when modal opens/closes or delivery changes (for future edit mode)
    useEffect(() => {
        if (opened) {
            if (isEditMode && delivery) {
                // TODO: Populate form for edit mode later
                // form.setValues(...)
            } else {
                form.reset(); // Reset for create mode
                // Add one initial empty pan row? Or prompt user to add? Let's prompt.
                // form.insertListItem('panShipments', { key: randomId(), servingPanId: '', recipeGuess: '', outWeightGrams: '' });
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [delivery, opened, isEditMode]);

    const handleSubmit = (values: DeliveryFormValues) => {
        onSubmit(values); // Pass validated data to parent
    };

    const handleClose = () => {
        form.reset();
        onClose();
    };

    // --- Form Fields ---
    const clientOptions = companyClients.map(c => ({ value: c.id, label: c.companyName }));
    const vehicleOptions = [{label: 'Nenhum', value: ''}, ...vehicles.map(v => ({ value: v.id, label: `${v.model} (${v.licensePlate})` }))];
    const driverOptions = [{label: 'Nenhum', value: ''}, ...drivers.map(d => ({ value: d.id, label: d.name }))];
    const panOptions = availablePans.map(p => ({
        value: p.id,
        label: `${p.panModel.name} (${p.uniqueIdentifier || p.id.substring(0, 6)})`
    }));


    const panFields = form.values.panShipments.map((item, index) => (
        <Paper key={item.key} p="xs" withBorder radius="sm" mt="xs">
            <Group grow align="flex-start" wrap="nowrap" gap="xs">
                 <Select
                    label={index === 0 ? "Panela" : undefined}
                    placeholder="Selecione/Escaneie..."
                    data={panOptions}
                    {...form.getInputProps(`panShipments.${index}.servingPanId`)}
                    searchable
                    required
                    limit={10}
                    nothingFoundMessage="Nenhuma panela disponível"
                    error={form.errors[`panShipments.${index}.servingPanId`]}
                    styles={{ label: { whiteSpace: 'nowrap' } }} // Prevent label wrapping
                />
                 {/* Optional: Add a simple text input for recipe guess */}
                <TextInput
                    label={index === 0 ? "Conteúdo (Opcional)" : undefined}
                    placeholder="Ex: Arroz"
                    {...form.getInputProps(`panShipments.${index}.recipeGuess`)}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                />
                 <NumberInput
                    label={index === 0 ? "Peso Saída (g)" : undefined}
                    placeholder="5500"
                    min={1} // Minimum weight
                    decimalScale={0} // No decimals for grams usually
                    required
                    {...form.getInputProps(`panShipments.${index}.outWeightGrams`)}
                    error={form.errors[`panShipments.${index}.outWeightGrams`]}
                    styles={{ label: { whiteSpace: 'nowrap' } }}
                    rightSection={<Text size="xs" c="dimmed">g</Text>}
                />
                <ActionIcon
                    color="red"
                    onClick={() => form.removeListItem("panShipments", index)}
                    mt={index === 0 ? 25 : 5} // Align with input
                    variant="light"
                >
                    <IconTrash size={16} />
                </ActionIcon>
            </Group>
        </Paper>
    ));

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={isEditMode ? "Editar Entrega" : "Criar Nova Entrega"}
            size="xl" // Make modal larger
            overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
        >
            <LoadingOverlay visible={isLoading} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Title order={4}>Detalhes da Entrega</Title>
                    <Select
                        required
                        label="Cliente"
                        placeholder="Selecione o cliente B2B..."
                        data={clientOptions}
                        {...form.getInputProps('companyClientId')}
                        searchable
                        limit={20}
                        nothingFoundMessage="Nenhum cliente encontrado"
                        error={form.errors.companyClientId}
                    />
                     <Group grow>
                         <Select
                            label="Veículo (Opcional)"
                            placeholder="Selecione um veículo..."
                            data={vehicleOptions}
                            {...form.getInputProps('vehicleId')}
                            searchable
                            clearable
                        />
                         <Select
                            label="Motorista (Opcional)"
                            placeholder="Selecione um motorista..."
                            data={driverOptions}
                            {...form.getInputProps('driverId')}
                            searchable
                            clearable
                        />
                    </Group>

                    {/* Pan Shipments Section */}
                    <Title order={4} mt="md">Panelas Enviadas</Title>
                    <ScrollArea.Autosize mah={300}>
                        <Stack gap={0}>
                            {panFields.length > 0 ? panFields : (
                                <Text c="dimmed" size="sm" ta="center" p="md">Nenhuma panela adicionada.</Text>
                            )}
                        </Stack>
                    </ScrollArea.Autosize>
                    {form.errors.panShipments && typeof form.errors.panShipments === 'string' && (
                        <Text c="red" size="xs" mt={-5}>{form.errors.panShipments}</Text>
                    )}
                    <Button
                        variant="outline"
                        onClick={() =>
                            form.insertListItem('panShipments', {
                                key: randomId(),
                                servingPanId: '',
                                recipeGuess: '',
                                outWeightGrams: ''
                            })
                        }
                        size="xs"
                        disabled={availablePans.length === 0} // Disable if no pans available
                    >
                        + Adicionar Panela
                    </Button>
                     {availablePans.length === 0 && !isLoading && (
                         <Text size="xs" c="orange">Nenhuma panela marcada como 'AVAILABLE'. Registre panelas ou atualize o status.</Text>
                     )}


                    <Button type="submit" mt="xl" loading={isLoading}>
                        {isEditMode ? "Salvar Alterações" : "Criar Entrega"}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}
