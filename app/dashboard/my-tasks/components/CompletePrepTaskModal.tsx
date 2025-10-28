// PATH: app/dashboard/my-tasks/components/CompletePrepTaskModal.tsx
"use client";

import { Modal, Button, NumberInput, Stack, Text, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { SerializedPrepTask } from "@/lib/types";

interface CompletePrepTaskModalProps {
    opened: boolean;
    onClose: () => void;
    task: SerializedPrepTask | null; // Pass the task being completed
    onSubmit: (actualQuantity: string) => void; // Callback with the entered quantity
}

export function CompletePrepTaskModal({
    opened,
    onClose,
    task,
    onSubmit,
}: CompletePrepTaskModalProps) {
    const form = useForm({
        // Initialize with target quantity as string
        initialValues: {
            quantityRun: task?.targetQuantity ?? "",
        },
        validate: {
            quantityRun: (value) => {
                const num = parseFloat(value);
                // Allow 0, but not negative or NaN
                return !isNaN(num) && num >= 0 ? null : "Quantidade produzida inválida (>= 0)";
            },
        },
    });

    // Update initial value if task changes while modal might be open (unlikely but safe)
    if (opened && task && form.values.quantityRun !== task.targetQuantity) {
        form.setFieldValue('quantityRun', task.targetQuantity);
    }

    const handleSubmit = (values: { quantityRun: string }) => {
        onSubmit(values.quantityRun); // Pass the string value back
    };

    const handleClose = () => {
         // Reset form when closing
         form.reset();
        onClose();
    };

    if (!task) return null;

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={`Concluir Preparo: ${task.prepRecipe.name}`}
            centered
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack>
                    <Title order={5}>Confirmar Quantidade Produzida</Title>
                    <Text size="sm">
                        Receita base produz: {task.prepRecipe.outputQuantity} {task.prepRecipe.outputIngredient.unit} de {task.prepRecipe.outputIngredient.name}.
                    </Text>
                     <Text size="sm">
                        Quantidade alvo da tarefa: {task.targetQuantity} {task.prepRecipe.outputIngredient.unit}.
                    </Text>
                    <NumberInput
                        required
                        label={`Quantidade Realmente Produzida (em ${task.prepRecipe.outputIngredient.unit})`}
                        description="Informe quanto foi produzido. Pode ser diferente do alvo."
                        placeholder={task.targetQuantity}
                        decimalScale={3}
                        min={0} // Allow zero
                        step={0.1}
                        {...form.getInputProps("quantityRun")}
                    />
                    <Button type="submit" mt="md" color="green">
                        Confirmar Conclusão e Ajustar Estoque
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}