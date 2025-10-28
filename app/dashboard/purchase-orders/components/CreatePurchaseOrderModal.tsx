// PATH: app/dashboard/purchase-orders/components/CreatePurchaseOrderModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Stack,
  LoadingOverlay,
  Select,
  NumberInput,
  Textarea,
  Group,
  ActionIcon,
  Text,
  Title,
  Divider,
  ScrollArea,
  Alert
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import 'dayjs/locale/pt-br';
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { randomId } from "@mantine/hooks";
import type { PurchaseOrder, Supplier, Ingredient } from '@prisma/client';
import { SerializedIngredientDef } from "@/lib/types"; // Import Ingredient type for dropdown
import { IconTrash } from "@tabler/icons-react";
import { formatCurrency } from "@/lib/utils";
import { Decimal } from "@prisma/client/runtime/library"; // Import Decimal for calculation

interface PurchaseOrderItemForm {
  key: string;
  ingredientId: string | null;
  orderedQuantity: string;
  unitCost: string;
}

interface CreatePurchaseOrderModalProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  suppliers: Supplier[];
  ingredients: SerializedIngredientDef[];
  isLoading: boolean;
}

export function CreatePurchaseOrderModal({
  opened,
  onClose,
  onSubmit,
  suppliers,
  ingredients,
  isLoading,
}: CreatePurchaseOrderModalProps) {

  const form = useForm({
    initialValues: {
      supplierId: null as string | null,
      orderDate: new Date(),
      expectedDeliveryDate: null as Date | null,
      invoiceNumber: "",
      notes: "",
      items: formList<PurchaseOrderItemForm>([]), // Use formList for dynamic items
    },
    validate: {
      items: {
        ingredientId: (value) => (value ? null : "Obrigatório"),
        orderedQuantity: (value) => {
            const num = parseFloat(value);
            return !isNaN(num) && num > 0 ? null : "Qtd. inválida";
        },
        unitCost: (value) => {
            const num = parseFloat(value);
            return !isNaN(num) && num >= 0 ? null : "Custo inválido"; // Allow 0 cost?
        },
      },
      // Optional: Add validation for supplierId, dates if needed
    },
  });

  // Add one empty item row when modal opens if empty
  useEffect(() => {
    if (opened && form.values.items.length === 0) {
      form.addListItem('items', { key: randomId(), ingredientId: null, orderedQuantity: '', unitCost: '' });
    } else if (!opened) {
        form.reset(); // Reset form when modal closes
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  // Calculate total cost
  const totalCost = form.values.items.reduce((sum, item) => {
      try {
          const quantity = new Decimal(item.orderedQuantity || 0);
          const cost = new Decimal(item.unitCost || 0);
          return sum.plus(quantity.times(cost));
      } catch {
          return sum; // Ignore items with invalid numbers during calculation
      }
  }, new Decimal(0));

  const handleFormSubmit = (values: typeof form.values) => {
     if (values.items.length === 0) {
         notifications.show({title: "Erro", message: "Adicione pelo menos um item ao pedido.", color: "orange"});
         return;
     }
    const payload = {
        supplierId: values.supplierId,
        orderDate: values.orderDate?.toISOString(),
        expectedDeliveryDate: values.expectedDeliveryDate?.toISOString(),
        invoiceNumber: values.invoiceNumber || null,
        notes: values.notes || null,
        items: values.items.map(({ key, ...itemData }) => itemData), // Remove 'key'
    };
    onSubmit(payload);
  };

  const handleClose = () => {
    onClose();
  };

  // Prepare data for Select inputs
  const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));
  const ingredientOptions = ingredients.map(i => ({
    value: i.id,
    label: `${i.name} (${i.unit})`
  }));

  // --- Form Fields for Items ---
  const itemFields = form.values.items.map((item, index) => {
      const selectedIngredient = ingredients.find(i => i.id === item.ingredientId);
      const itemTotal = (() => {
          try {
              const q = new Decimal(item.orderedQuantity || 0);
              const c = new Decimal(item.unitCost || 0);
              return q.times(c);
          } catch { return new Decimal(0); }
      })();

      return (
        <Group key={item.key} grow align="flex-start" wrap="nowrap" gap="xs" mb="xs">
          <Select
            label={index === 0 ? "Ingrediente" : undefined}
            placeholder="Selecione..."
            data={ingredientOptions}
            {...form.getInputProps(`items.${index}.ingredientId`)}
            limit={20}
            searchable
            required
            error={form.errors[`items.${index}.ingredientId`]}
            // When ingredient changes, update unit cost placeholder if available
            onChange={(value) => {
                form.setFieldValue(`items.${index}.ingredientId`, value);
                const ingredient = ingredients.find(i => i.id === value);
                if (ingredient) {
                    // This sets the *value* if cost is known, maybe better as placeholder?
                    // form.setFieldValue(`items.${index}.unitCost`, ingredient.costPerUnit);
                }
            }}
          />
          <NumberInput
            label={index === 0 ? `Qtd. Pedida (${selectedIngredient?.unit || 'UN'})` : undefined}
            placeholder="10"
            min={0.001}
            decimalScale={3}
            {...form.getInputProps(`items.${index}.orderedQuantity`)}
            required
            error={form.errors[`items.${index}.orderedQuantity`]}
          />
           <NumberInput
            label={index === 0 ? `Custo Unit. (R$ / ${selectedIngredient?.unit || 'UN'})` : undefined}
            placeholder={selectedIngredient?.costPerUnit ?? '0.00'} // Suggest last known cost
            min={0}
            decimalScale={4} // Allow more precision for cost
            {...form.getInputProps(`items.${index}.unitCost`)}
            required
            error={form.errors[`items.${index}.unitCost`]}
          />
          <Stack gap={0} mt={index === 0 ? 25 : 0} align="center">
            <Text size="xs" c="dimmed">Total</Text>
            <Text size="sm" fw={500}>{formatCurrency(itemTotal.toNumber())}</Text>
          </Stack>
          <ActionIcon
            color="red"
            onClick={() => form.removeListItem("items", index)}
            mt={index === 0 ? 25 : 0}
            variant="light"
            disabled={form.values.items.length <= 1}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      );
  });


  return (
    <Modal
        opened={opened}
        onClose={handleClose}
        title="Nova Ordem de Compra"
        size="xl" // Larger modal for items
    >
      <LoadingOverlay visible={isLoading} />
      <form onSubmit={form.onSubmit(handleFormSubmit)}>
        <Stack>
            {/* PO Header Info */}
            <Group grow>
                 <Select
                    label="Fornecedor (Opcional)"
                    placeholder="Selecione um fornecedor..."
                    data={supplierOptions}
                    {...form.getInputProps("supplierId")}
                    searchable
                    clearable
                />
                 <TextInput
                    label="Nº Nota Fiscal (Opcional)"
                    placeholder="NF-e 123456"
                    {...form.getInputProps("invoiceNumber")}
                />
            </Group>
             <Group grow>
                 <DateInput
                    label="Data do Pedido"
                    valueFormat="DD/MM/YYYY"
                    locale="pt-br"
                    defaultValue={new Date()} // Default to today
                    {...form.getInputProps("orderDate")}
                />
                 <DateInput
                    label="Data Prevista Entrega (Opcional)"
                    valueFormat="DD/MM/YYYY"
                    locale="pt-br"
                    minDate={new Date()}
                    {...form.getInputProps("expectedDeliveryDate")}
                    clearable
                />
            </Group>

            <Divider my="sm" label="Itens do Pedido" labelPosition="center" />

             {/* PO Items */}
             {!ingredients || ingredients.length === 0 ? (
                 <Alert color="orange" title="Atenção">
                    Nenhum ingrediente definido no sistema. Adicione ingredientes antes de criar um pedido.
                 </Alert>
             ) : (
                <>
                    <ScrollArea.Autosize mah={300}>
                         <Stack gap={0}>
                            {itemFields.length > 0 ? itemFields : <Text c="dimmed" size="sm" ta="center">Adicione itens abaixo.</Text>}
                        </Stack>
                    </ScrollArea.Autosize>
                    <Button
                        variant="outline"
                        onClick={() => form.addListItem('items', { key: randomId(), ingredientId: null, orderedQuantity: '', unitCost: '' })}
                        size="xs"
                        disabled={!ingredients || ingredients.length === 0}
                    >
                        + Adicionar Item
                    </Button>
                </>
             )}

             <Divider my="sm" />

             <Group justify="space-between">
                <Textarea
                    label="Notas (Opcional)"
                    placeholder="Instruções especiais, referência..."
                    {...form.getInputProps("notes")}
                    style={{ flexGrow: 1 }}
                />
                 <Stack gap={0} align="flex-end">
                     <Text size="sm">Valor Total Estimado:</Text>
                     <Title order={3}>{formatCurrency(totalCost.toNumber())}</Title>
                 </Stack>
             </Group>


          <Button
            type="submit"
            mt="xl"
            loading={isLoading}
            disabled={!ingredients || ingredients.length === 0 || form.values.items.length === 0}
            >
            Criar Ordem de Compra
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
