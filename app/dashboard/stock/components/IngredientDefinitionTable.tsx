// PATH: app/dashboard/stock/components/IngredientDefinitionTable.tsx
"use client";

import {
  Table,
  Text,
  Center,
  Loader,
  ActionIcon,
  Tooltip, // Added Tooltip
} from "@mantine/core";
// Import Ingredient type directly from Prisma client
import { Ingredient } from "@prisma/client";
import { IconPlus } from "@tabler/icons-react"; // Use Tabler icon
import { formatCurrency } from "@/lib/utils"; // For cost display

// Type for Ingredient Definition from API
type SerializedIngredientDef = Omit<Ingredient, "costPerUnit"> & {
  costPerUnit: string;
};

type IngredientDefinitionTableProps = {
  items: SerializedIngredientDef[];
  loading: boolean;
  onAddStockClick: (item: SerializedIngredientDef) => void; // Changed handler name
  // Add onEdit/onDelete later if needed
};

export function IngredientDefinitionTable({
  items,
  loading,
  onAddStockClick, // Changed handler name
}: IngredientDefinitionTableProps) {
  const rows = items.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Text fw={500}>{item.name}</Text>
      </Table.Td>
       <Table.Td>
        <Text c="dimmed">{item.unit}</Text>
      </Table.Td>
      <Table.Td>
        {/* Display cost per unit */}
        <Text>{formatCurrency(parseFloat(item.costPerUnit))}</Text>
      </Table.Td>
      <Table.Td>
        <Tooltip label="Adicionar Lote de Estoque">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => onAddStockClick(item)} // Changed handler name
            >
              <IconPlus size={16} />
            </ActionIcon>
        </Tooltip>
        {/* Add Edit/Delete definition actions later */}
      </Table.Td>
    </Table.Tr>
  ));

  const colSpan = 4;

  return (
    <Table.ScrollContainer minWidth={600}>
      <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome do Ingrediente</Table.Th>
            <Table.Th>Unidade Base</Table.Th>
            <Table.Th>Custo por Unidade</Table.Th>
            <Table.Th>Adicionar Lote</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {loading ? (
            <Table.Tr>
              <Table.Td colSpan={colSpan}>
                <Center h={200}>
                  <Loader color="blue" />
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={colSpan}>
                <Text ta="center" c="dimmed" py="lg">
                  Nenhuma definição de ingrediente encontrada.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}