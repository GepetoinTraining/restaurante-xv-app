"use client";

import { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Stack,
  LoadingOverlay,
  NumberInput,
  Text,
  Title,
  Select,
  Textarea, // Added for notes
  Group,
  List,
  ThemeIcon,
  Alert, // Added Alert
} from "@mantine/core";
import { IconCircleCheck, IconCircleX, IconExclamationCircle } from "@tabler/icons-react"; // Added icons
import { useForm } from "@mantine/form";
import { ApiResponse, SerializedPrepRecipe, SerializedStockHolding } from "@/lib/types";
import { notifications } from "@mantine/notifications";
// REMOVED: import { Decimal } from "@prisma/client/runtime/library";
import { useQuery } from "@tanstack/react-query";

type StockLocation = { id: string; name: string };

interface ExecutePrepTaskModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prepRecipe: SerializedPrepRecipe | null;
  locations: StockLocation[]; // Pass available storage locations
}

// Helper to fetch current stock for required ingredients at a location
// API returns quantities as strings, so Map value is string
const fetchInputStock = async (ingredientIds: string[], locationId: string): Promise<Map<string, string>> => {
    const params = new URLSearchParams({ venueObjectId: locationId });
    ingredientIds.forEach(id => params.append('ingredientId', id));

    const res = await fetch(`/api/stock-holdings?${params.toString()}`);
    const result: ApiResponse<SerializedStockHolding[]> = await res.json();
    if (!res.ok || !result.success) throw new Error(result.error || "Falha ao buscar estoque atual");

    // Aggregate quantities as strings
    const stockMap = new Map<string, string>();
    result.data?.forEach(holding => {
        const current = parseFloat(stockMap.get(holding.ingredientId) ?? "0");
        const holdingQty = parseFloat(holding.quantity); // Parse holding quantity string
        // Store the sum back as a string
        stockMap.set(holding.ingredientId, (current + holdingQty).toString());
    });
    return stockMap;
};


export function ExecutePrepTaskModal({
  opened,
  onClose,
  onSuccess,
  prepRecipe,
  locations,
}: ExecutePrepTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Store required quantities as numbers now
  const [calculatedInputs, setCalculatedInputs] = useState<{ ingredient: { name: string; unit: string; id: string }, required: number }[]>([]);

  const form = useForm({
    initialValues: {
      quantityRun: "", // Start empty, user enters desired output qty
      locationId: null as string | null,
      notes: "",
    },
    validate: {
      quantityRun: (value) => {
          // Use parseFloat for validation
          const num = parseFloat(value);
          if (isNaN(num)) return "Quantidade inválida";
          return num > 0 ? null : "Quantidade deve ser positiva";
      },
      locationId: (val) => (val ? null : "Localização é obrigatória"),
    },
  });

  const selectedLocationId = form.values.locationId;
  const quantityRunValue = form.values.quantityRun;

  // Fetch current stock (Map<string, string>)
  const { data: currentInputStock, isLoading: isLoadingStock } = useQuery({
      queryKey: ['inputStock', prepRecipe?.id, selectedLocationId],
      queryFn: () => {
          if (!prepRecipe || !selectedLocationId) return new Map<string, string>();
          const inputIds = prepRecipe.inputs.map(inp => inp.ingredient.id);
          return fetchInputStock(inputIds, selectedLocationId);
      },
      enabled: !!prepRecipe && !!selectedLocationId && opened,
      placeholderData: new Map<string, string>(),
  });


  // Recalculate required inputs when quantityRun or prepRecipe changes
  useEffect(() => {
    if (prepRecipe && quantityRunValue) {
      try {
        // Use parseFloat for calculations
        const quantityRunNum = parseFloat(quantityRunValue);
        const outputQuantityNum = parseFloat(prepRecipe.outputQuantity);

        if (!isNaN(quantityRunNum) && !isNaN(outputQuantityNum) && quantityRunNum > 0 && outputQuantityNum > 0) {
          const runs = quantityRunNum / outputQuantityNum;
          const required = prepRecipe.inputs.map(input => {
             const inputQuantityNum = parseFloat(input.quantity);
             return {
                ingredient: input.ingredient,
                // Store required as number
                required: inputQuantityNum * runs,
             };
          });
          setCalculatedInputs(required);
        } else {
          setCalculatedInputs([]);
        }
      } catch {
        setCalculatedInputs([]); // Handle invalid number input
      }
    } else {
      setCalculatedInputs([]);
    }
  }, [quantityRunValue, prepRecipe]);

  const handleSubmit = async (values: typeof form.values) => {
    setIsSubmitting(true);
    const payload = {
      prepRecipeId: prepRecipe!.id,
      quantityRun: values.quantityRun, // Send as string, API handles Decimal
      locationId: values.locationId,
      notes: values.notes,
    };

    try {
      const response = await fetch("/api/prep-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao registrar tarefa de preparo");

      notifications.show({
        title: "Sucesso!",
        message: `Tarefa de preparo para "${prepRecipe!.name}" registrada. Estoque atualizado.`,
        color: "green",
      });
      onSuccess(); // Close modal and refresh relevant data via parent
    } catch (error: any) {
      notifications.show({
        title: "Erro",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setCalculatedInputs([]);
    onClose();
  };

  const locationOptions = locations.map(l => ({ label: l.name, value: l.id }));

  // Check if there is enough stock for each required input (using numbers)
  const stockCheckResults = calculatedInputs.map(input => {
      // Parse the string from the map
      const availableString = currentInputStock?.get(input.ingredient.id) ?? "0";
      const available = parseFloat(availableString);
      const sufficient = available >= input.required; // Direct number comparison
      return { ...input, available, sufficient };
  });
  const hasInsufficientStock = selectedLocationId && !isLoadingStock && stockCheckResults.some(res => !res.sufficient);


  if (!prepRecipe) return null; // Should not happen if opened correctly

  return (
    <Modal opened={opened} onClose={handleClose} title={`Executar Preparo: ${prepRecipe.name}`} centered size="lg">
      <LoadingOverlay visible={isSubmitting || isLoadingStock} />
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Title order={5}>Produzir:</Title>
          <Text>{prepRecipe.outputIngredient.name} ({prepRecipe.outputIngredient.unit})</Text>

          <Group grow>
             <NumberInput
                required
                label="Quantidade a Produzir"
                description={`Em ${prepRecipe.outputIngredient.unit}`}
                placeholder="Ex: 500 (para 500g ou 500ml)"
                min={0.001}
                decimalScale={3}
                {...form.getInputProps("quantityRun")}
            />
            <Select
                required
                label="Localização da Produção/Armazenagem"
                placeholder="Onde o preparo acontece?"
                data={locationOptions}
                {...form.getInputProps("locationId")}
                searchable
                // ---- START FIX ----
                // withinPortal // Removed this line
                // ---- END FIX ----
            />
          </Group>

          {calculatedInputs.length > 0 && (
             <>
                <Title order={5} mt="md">Ingredientes Necessários:</Title>
                 {hasInsufficientStock && (
                     <Alert color="red" title="Estoque Insuficiente" icon={<IconExclamationCircle/>}>
                         Não há estoque suficiente de um ou mais ingredientes na localização selecionada para esta quantidade. Verifique abaixo.
                     </Alert>
                 )}
                 <List spacing="xs" size="sm" center>
                    {stockCheckResults.map(input => {
                        // Use standard number toFixed
                        const availableFormatted = input.available.toFixed(3);
                        const requiredFormatted = input.required.toFixed(3);
                        return (
                             <List.Item
                                key={input.ingredient.id}
                                icon={
                                  <ThemeIcon color={input.sufficient ? 'teal' : 'red'} size={18} radius="xl">
                                    {input.sufficient ? <IconCircleCheck size="0.8rem" /> : <IconCircleX size="0.8rem" />}
                                  </ThemeIcon>
                                }
                             >
                                <Text span fw={500}>{input.ingredient.name}</Text>: {requiredFormatted} {input.ingredient.unit}
                                <Text span size="xs" c="dimmed" ml="xs">(Disp: {availableFormatted})</Text>
                             </List.Item>
                        );
                    })}
                </List>
             </>
          )}

          <Textarea
            label="Notas (Opcional)"
            placeholder="Ex: Lote do fornecedor X, preparado por Y"
            {...form.getInputProps('notes')}
            minRows={2}
            mt="md"
          />

          <Button
            type="submit"
            mt="xl"
            color="green"
            loading={isSubmitting}
            disabled={!form.isValid() || hasInsufficientStock || isLoadingStock} // Disable if form invalid, not enough stock, or stock check loading
           >
            Registrar Produção e Ajustar Estoque
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}