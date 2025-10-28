// PATH: app/dashboard/prep-management/components/AssignTaskModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Modal, Button, Stack, Select, Text, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { SerializedPrepTask, UserWithWorkstation } from "@/lib/types";

interface AssignTaskModalProps {
    opened: boolean;
    onClose: () => void;
    onAssign: (userId: string | null) => void; // Pass null to unassign
    staffList: UserWithWorkstation[];
    task: SerializedPrepTask | null;
}

export function AssignTaskModal({
    opened,
    onClose,
    onAssign,
    staffList,
    task,
}: AssignTaskModalProps) {
    const form = useForm({
        initialValues: {
            assignedToUserId: task?.assignedToUserId ?? null as string | null,
        },
    });

    // Update form value if task changes while modal is open
    useEffect(() => {
        if (opened && task) {
            form.setFieldValue('assignedToUserId', task.assignedToUserId ?? null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [task, opened]);


    const handleSubmit = (values: { assignedToUserId: string | null }) => {
        onAssign(values.assignedToUserId); // Pass selected user ID (or null)
    };

     const handleClose = () => {
         // Don't reset form here, rely on useEffect when opening/task changes
        onClose();
    };

    const staffOptions = [
         { value: '', label: 'Remover atribuição (Pendente)' }, // Option to unassign
         ...staffList.map(s => ({ value: s.id, label: s.name }))
     ];

    if (!task) return null;

    // ---- START FIX: Provide fallback values ----
    const unit = task.prepRecipe.outputIngredient?.unit ?? 'unid.';
    const name = task.prepRecipe.outputIngredient?.name ?? 'Item Preparado';
    // ---- END FIX ----

    return (
        <Modal opened={opened} onClose={handleClose} title="Atribuir Tarefa de Preparo">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Title order={5}>{task.prepRecipe.name}</Title>
                    {/* ---- START FIX: Use fallback variables ---- */}
                     <Text size="sm">
                        Meta: {task.targetQuantity} {unit} de {name}
                    </Text>
                    {/* ---- END FIX ---- */}
                     <Text size="sm" c="dimmed">Local: {task.location.name}</Text>

                    <Select
                        label="Atribuir Para"
                        placeholder="Selecione um membro da equipe..."
                        data={staffOptions}
                        {...form.getInputProps('assignedToUserId')}
                        searchable
                        clearable // Allows selecting the 'Remover' option easily
                        mt="md"
                    />
                    <Button type="submit" mt="md">
                        {form.values.assignedToUserId ? "Confirmar Atribuição" : "Remover Atribuição"}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}