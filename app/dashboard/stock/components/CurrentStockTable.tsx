// PATH: app/dashboard/stock/components/CurrentStockTable.tsx
"use client";

import {
  Table,
  Text,
  Center,
  Loader,
  Badge,
  ActionIcon,
  Tooltip, // Added Tooltip
} from "@mantine/core";
import { AggregatedIngredientStock } from "@/lib/types"; // Use new type
import { IconPlus } from "@tabler/icons-react"; // Use Tabler icon
import { formatCurrency } from "@/lib/utils"; // For cost display

type CurrentStockTableProps = {
  stockLevels: AggregatedIngredientStock[];
  loading: boolean;
  onAddStockClick: (item: AggregatedIngredientStock) => void; // Renamed handler
};

export function CurrentStockTable({
  stockLevels,
  loading,
  onAddStockClick, // Renamed handler
}: CurrentStockTableProps) {
  const rows = stockLevels.map((item) => {
    const totalStockNum = parseFloat(item.totalStock);
    const costPerUnitNum = parseFloat(item.costPerUnit);
    const totalValue = totalStockNum * costPerUnitNum;
    // Low stock logic removed as reorderThreshold is not in aggregated data

    return (
      <Table.Tr key={item.ingredientId}>
        <Table.Td>
          <Text fw={500}>{item.name}</Text>
        </Table.Td>
        <Table.Td>
          <Text fw={700}>
            {/* Format potentially large or decimal numbers */}
            {totalStockNum.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text c="dimmed">{item.unit}</Text>
        </Table.Td>
        <Table.Td>
            {/* Display total cost value */}
           <Text size="sm">{formatCurrency(totalValue)}</Text>
        </Table.Td>
        <Table.Td>
           <Tooltip label="Adicionar Lote de Estoque">
               <ActionIcon
                 variant="light"
                 color="blue"
                 onClick={() => onAddStockClick(item)} // Use renamed handler
               >
                 <IconPlus size={16} />
               </ActionIcon>
           </Tooltip>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Table.ScrollContainer minWidth={600}>
      <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Ingrediente</Table.Th>
            <Table.Th>Qtd. Total</Table.Th>
            <Table.Th>Unidade Base</Table.Th>
            <Table.Th>Valor Total (Custo)</Table.Th>
            <Table.Th>Adicionar Lote</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Center h={200}>
                  <Loader color="blue" />
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text ta="center" c="dimmed" py="lg">
                  Nenhum estoque encontrado. Defina ingredientes e adicione lotes.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}