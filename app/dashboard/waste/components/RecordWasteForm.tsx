// PATH: app/dashboard/waste/components/RecordWasteForm.tsx
"use client";

import { useState } from "react";
import {
    Paper,
    Title,
    Stack,
    Select,
    NumberInput,
    TextInput,
    Textarea,
    Button,
    LoadingOverlay,
    Group,
    Text
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse, StorageLocation, SerializedIngredientDef } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";

interface RecordWasteFormProps {
    ingredients: SerializedIngredientDef[];
    locations: StorageLocation[];
    onSuccess: () => void;
}

// Predefined common reasons
const wasteReasons = [
    { value: 'Expired', label: 'Validade Expirada' },
    { value: 'Spoiled', label: 'Estragado / Mofado' },
    { value: 'Dropped', label: 'Derrubado / Quebrado' },
    { value: 'Burnt', label: 'Queimado (Preparo)' },
    { value: 'Contaminated', label: 'Contaminado' },
    { value: 'Overcooked', label: 'Passou do Ponto (Preparo)' },
    { value: 'Error', label: 'Erro de Pedido/Produção' },
    { value: 'Theft', label: 'Furto / Desvio' }, // Consider security implications
    { value: 'Other', label: 'Outro (descrever)' },
];

export function RecordWasteForm({ ingredients, locations, onSuccess }: RecordWasteFormProps) {
    const [selectedIngredientUnit, setSelectedIngredientUnit] = useState<string | null>(null);

    const form = useForm({
        initialValues: {
            ingredientId: null as string | null,
            venueObjectId: null as string | null,
            quantity: "",
            reason: null as string | null,
            notes: "",
        },
        validate: {
            ingredientId: (val) => (val ? null : "Ingrediente é obrigatório"),
            venueObjectId: (val) => (val ? null : "Localização é obrigatória"),
            quantity: (val) => {
                const num = parseFloat(val);
                return !isNaN(num) && num > 0 ? null : "Quantidade inválida (> 0)";
            },
            reason: (val) => (val ? null : "Motivo é obrigatório"),
            notes: (val, values) => (values.reason === 'Other' && !val.trim() ? 'Descrição é obrigatória para "Outro"' : null),
        },
    });

    const recordWasteMutation = useMutation<ApiResponse, Error, typeof form.values>({
         mutationFn: async (formData) => {
             const payload = {
                 ingredientId: formData.ingredientId,
                 venueObjectId: formData.venueObjectId,
                 quantity: formData.quantity, // API handles string -> Decimal
                 reason: formData.reason,
                 notes: formData.reason === 'Other' ? formData.notes : null, // Only send notes if reason is 'Other' or if notes have content
             };
             const response = await fetch("/api/waste", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
             });
             const result: ApiResponse = await response.json();
             if (!response.ok || !result.success) {
                 throw new Error(result.error || "Falha ao registrar perda");
             }
             return result;
         },
         onSuccess: (data) => {
             const selectedIngredientName = ingredients.find(i => i.id === form.values.ingredientId)?.name || 'Ingrediente';
             notifications.show({
                 title: "Perda Registrada",
                 message: `Perda de ${form.values.quantity} ${selectedIngredientUnit || 'UN'} de ${selectedIngredientName} registrada com sucesso. Estoque deduzido.`,
                 color: "green"
             });
             form.reset();
             setSelectedIngredientUnit(null);
             onSuccess(); // Callback to parent (e.g., refetch stock data)
         },
         onError: (error) => {
              notifications.show({ title: "Erro ao Registrar", message: error.message, color: "red" });
         }
    });

    const handleIngredientChange = (value: string | null) => {
        form.setFieldValue('ingredientId', value);
        const unit = ingredients.find(i => i.id === value)?.unit;
        setSelectedIngredientUnit(unit || null);
    };

    const ingredientOptions = ingredients.map(i => ({
        value: i.id,
        label: `${i.name} (${i.unit}) ${i.isPrepared ? '[P]' : ''}`
    }));
    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));

    return (
        <Paper withBorder p="md" radius="md" pos="relative">
            <LoadingOverlay visible={recordWasteMutation.isPending} overlayProps={{ blur: 1 }}/>
            <form onSubmit={form.onSubmit((values) => recordWasteMutation.mutate(values))}>
                <Stack>
                    <Title order={4}>Detalhes da Perda</Title>
                    <Select
                        required
                        label="Ingrediente Perdido"
                        placeholder="Selecione o item..."
                        data={ingredientOptions}
                        {...form.getInputProps('ingredientId')}
                        onChange={handleIngredientChange} // Update unit on change
                        searchable
                        limit={20}
                        nothingFoundMessage="Nenhum ingrediente encontrado"
                    />
                    <Select
                        required
                        label="Localização (Onde ocorreu / De onde deduzir)"
                        placeholder="Selecione o local..."
                        data={locationOptions}
                        {...form.getInputProps('venueObjectId')}
                        searchable
                        limit={20}
                        nothingFoundMessage="Nenhum local encontrado"
                    />
                    <NumberInput
                        required
                        label={`Quantidade Perdida (${selectedIngredientUnit || 'Unidade'})`}
                        placeholder="Ex: 500"
                        min={0.001}
                        decimalScale={3} // Allow decimals
                        step={0.1}
                        {...form.getInputProps('quantity')}
                    />
                     <Select
                        required
                        label="Motivo da Perda"
                        placeholder="Selecione o motivo..."
                        data={wasteReasons}
                        {...form.getInputProps('reason')}
                    />
                    {form.values.reason === 'Other' && (
                        <Textarea
                            required
                            label="Descrição para 'Outro'"
                            placeholder="Descreva o motivo da perda..."
                            {...form.getInputProps('notes')}
                            minRows={2}
                        />
                    )}
                     {form.values.reason !== 'Other' && ( // Optional notes for other reasons
                        <Textarea
                            label="Notas Adicionais (Opcional)"
                            placeholder="Detalhes extras..."
                            {...form.getInputProps('notes')}
                            minRows={2}
                        />
                    )}
                    <Button
                        type="submit"
                        mt="md"
                        color="red"
                        loading={recordWasteMutation.isPending}
                        disabled={!form.isValid()}
                    >
                        Confirmar Registro de Perda
                    </Button>
                </Stack>
            </form>
        </Paper>
    );
}