"use client";

import { Modal, TextInput, Select, NumberInput, Button, Group, Stack } from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { Product } from "@/lib/types"; // Use client-side Product
// --- START FIX ---
// Comment out imports for non-existent types
// import { DiscountType, Promotion } from "@prisma/client";
// --- END FIX ---
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { useState } from "react";
import { PromotionWithProduct } from "../page";

// --- START FIX ---
// Define a placeholder DiscountType enum if needed temporarily for UI elements
// This allows the code to compile but the feature won't fully work without schema changes.
enum DiscountType {
    PERCENTAGE = "PERCENTAGE",
    FIXED = "FIXED",
}
// Define a placeholder Promotion type if needed
type Promotion = {
    id: number | string; // Use appropriate ID type
    createdAt: Date;
    // Add other fields based on expected structure if necessary
    productId: number; // Assuming number based on payload, adjust if needed
    discountValue: number;
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    discountType: DiscountType; // Use the placeholder enum
    name: string; // Add name based on form values
};
// --- END FIX ---


type CreatePromotionModalProps = {
    opened: boolean;
    onClose: () => void;
    products: Product[]; // Use client-side Product
    onPromotionCreated: (promotion: PromotionWithProduct) => void;
};

export function CreatePromotionModal({ opened, onClose, products, onPromotionCreated }: CreatePromotionModalProps) {
    const [loading, setLoading] = useState(false);
    const form = useForm({
        initialValues: {
            name: "",
            productId: null as string | null,
            discountType: DiscountType.PERCENTAGE, // Use placeholder enum
            discountValue: 0,
            startDate: new Date(),
            endDate: null as Date | null,
        },
        // Add validation as needed
    });

    const productOptions = products.map(p => ({
        // Ensure product ID is treated as string for Select value
        value: p.id.toString(),
        label: p.name,
    }));

    const handleSubmit = async (values: typeof form.values) => {
        setLoading(true);
        if (!values.productId || !values.startDate) {
             notifications.show({ title: "Erro", message: "Campos obrigatórios em falta.", color: "red" });
             setLoading(false);
             return;
        }

        try {
            // --- START FIX ---
            // Construct payload using placeholder Promotion type
            // Note: The API route is commented out, so this fetch will likely fail.
            const payload: Omit<Promotion, 'id' | 'createdAt'> = {
                ...values,
                // Ensure productId is handled correctly (e.g., number if API expects number)
                // Adjust this based on how the API (when implemented) expects the ID
                productId: Number(values.productId), // Example: Convert string ID to number
                discountValue: Number(values.discountValue),
                startDate: values.startDate,
                endDate: values.endDate || null,
                isActive: true, // Set default
                // discountType is already in values
                // name is already in values
            };
            // --- END FIX ---


            // This fetch will fail as the API route is commented out/disabled
            const response = await fetch("/api/promotions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result: ApiResponse<PromotionWithProduct> = await response.json();
            // Check if the route indicated it's disabled (e.g., 404 status)
            if (response.status === 404 && result.error?.includes("desativada")) {
                 notifications.show({
                     title: "Funcionalidade Indisponível",
                     message: "A criação de promoções está desativada no momento.",
                     color: "yellow",
                 });
                 // Optionally close modal even if disabled
                 // onClose();
                 return; // Stop further processing
            }

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Falha ao criar promoção");
            }

            notifications.show({
                title: "Sucesso",
                message: "Promoção criada com sucesso!",
                color: "green",
            });
            onPromotionCreated(result.data!); // Notify parent
            form.reset();
            onClose();

        } catch (error: any) {
            notifications.show({
                title: "Erro",
                message: error.message,
                color: "red",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Criar Nova Promoção" centered>
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <TextInput
                        label="Nome da Promoção"
                        placeholder="Ex: Happy Hour Cerveja"
                        required
                        {...form.getInputProps("name")}
                    />
                    <Select
                        label="Produto"
                        placeholder="Selecione um produto"
                        data={productOptions}
                        searchable
                        required
                        {...form.getInputProps("productId")}
                    />
                    <Group grow>
                        <Select
                            label="Tipo de Desconto"
                            data={[
                                // Use placeholder enum values
                                { value: DiscountType.PERCENTAGE, label: "Percentagem (%)" },
                                { value: DiscountType.FIXED, label: "Valor Fixo (R$)" },
                            ]}
                            required
                            {...form.getInputProps("discountType")}
                        />
                        <NumberInput
                            label="Valor do Desconto"
                            placeholder={form.values.discountType === DiscountType.PERCENTAGE ? "Ex: 15" : "Ex: 5.50"}
                            min={0}
                            decimalScale={2}
                            required
                            {...form.getInputProps("discountValue")}
                        />
                    </Group>
                    <Group grow>
                        <DateInput
                            label="Data de Início"
                            valueFormat="DD/MM/YYYY"
                            required
                            {...form.getInputProps("startDate")}
                        />
                        <DateInput
                            label="Data de Fim (Opcional)"
                            valueFormat="DD/MM/YYYY"
                            clearable
                            minDate={form.values.startDate || new Date()}
                            {...form.getInputProps("endDate")}
                        />
                    </Group>
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={onClose} disabled={loading}>Cancelar</Button>
                        <Button type="submit" loading={loading}>Criar Promoção</Button>
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}