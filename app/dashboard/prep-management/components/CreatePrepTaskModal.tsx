// PATH: app/dashboard/prep-management/components/CreatePrepTaskModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Stack, LoadingOverlay, Select, NumberInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { ApiResponse, SerializedPrepRecipe, StorageLocation, UserWithWorkstation } from "@/lib/types";

interface CreatePrepTaskModalProps {
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    recipes: SerializedPrepRecipe[];
    locations: StorageLocation[];
    staff: UserWithWorkstation[];
}

export function CreatePrepTaskModal({
    opened,
    onClose,
    onSuccess,
    recipes,
    locations,
    staff,
}: CreatePrepTaskModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            prepRecipeId: null as string | null,
            targetQuantity: "",
            locationId: null as string | null,
            assignedToUserId: null as string | null,
            notes: "",
        },
        validate: {
            prepRecipeId: (val) => (val ? null : "Receita é obrigatória"),
            targetQuantity: (val) => {
                const num = parseFloat(val);
                return !isNaN(num) && num > 0 ? null : "Qtd. Alvo inválida (> 0)";
            },
            locationId: (val) => (val ? null : "Localização é obrigatória"),
        },
    });

    // Reset form when modal closes or opens
    useEffect(() => {
        if (!opened) {
            form.reset();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opened]);

    const handleSubmit = async (values: typeof form.values) => {
        setIsSubmitting(true);
        const payload = {
            ...values,
            targetQuantity: values.targetQuantity, // API expects string or number
        };

        try {
            const response = await fetch("/api/prep-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data: ApiResponse = await response.json();

            if (response.ok && data.success) {
                notifications.show({ title: "Sucesso", message: "Tarefa de preparo criada!", color: "green" });
                onSuccess();
            } else {
                notifications.show({ title: "Erro", message: data.error || "Falha ao criar tarefa", color: "red" });
            }
        } catch (error: any) {
            notifications.show({ title: "Erro", message: error.message || "Erro inesperado", color: "red" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const recipeOptions = recipes.map(r => ({
        value: r.id,
        label: `${r.name} (Produz ${r.outputQuantity} ${r.outputIngredient.unit} ${r.outputIngredient.name})`
    }));
    const locationOptions = locations.map(l => ({ value: l.id, label: l.name }));
    const staffOptions = [{value: '', label: 'Não atribuir (Pendente)'}, ...staff.map(s => ({ value: s.id, label: s.name }))];

    const selectedRecipe = recipes.find(r => r.id === form.values.prepRecipeId);
    const outputUnit = selectedRecipe?.outputIngredient.unit ?? 'UN';

    return (
        <Modal opened={opened} onClose={onClose} title="Criar Nova Tarefa de Preparo" size="lg">
            <LoadingOverlay visible={isSubmitting} />
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Select
                        required
                        label="Receita de Preparo"
                        placeholder="Selecione a receita a ser executada"
                        data={recipeOptions}
                        {...form.getInputProps('prepRecipeId')}
                        searchable
                        limit={20}
                    />
                     <NumberInput
                        required
                        label={`Quantidade Alvo (em ${outputUnit})`}
                        description="Quanto você quer que seja produzido?"
                        placeholder="Ex: 500"
                        min={0.001}
                        decimalScale={3}
                        {...form.getInputProps('targetQuantity')}
                    />
                    <Select
                        required
                        label="Localização da Produção/Armazenagem"
                        placeholder="Onde será feito e/ou guardado?"
                        data={locationOptions}
                        {...form.getInputProps('locationId')}
                        searchable
                        limit={20}
                    />
                     <Select
                        label="Atribuir Para (Opcional)"
                        placeholder="Deixar pendente para alguém assumir"
                        data={staffOptions}
                        {...form.getInputProps('assignedToUserId')}
                        searchable
                        clearable
                        limit={20}
                    />
                    <Textarea
                        label="Notas (Opcional)"
                        placeholder="Instruções adicionais, prioridade, etc."
                        {...form.getInputProps('notes')}
                        minRows={2}
                    />

                    <Button type="submit" mt="md" loading={isSubmitting}>
                        Criar Tarefa
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}