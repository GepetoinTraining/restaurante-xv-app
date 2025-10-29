// PATH: app/dashboard/purchase-orders/components/PurchaseOrderTable.tsx
"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
  Center,
  Button,
} from "@mantine/core";
import { IconTruckDelivery, IconEye } from "@tabler/icons-react";
import {
  PurchaseOrder,
  PurchaseOrderItem,
  POStatus, // Correct enum
  Supplier,
  User,
  Ingredient,
} from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

// Type expected by this component (serialized data from API)
export type SerializedPurchaseOrder = Omit<
  PurchaseOrder,
  "totalAmount" | "orderDate" | "expectedDeliveryDate"
> & {
  totalAmount: string | null;
  orderDate: string; // ISO string
  expectedDeliveryDate: string | null; // ISO string
  supplier: { name: string } | null;
  createdBy: { name: string };
  items: (Omit<
    PurchaseOrderItem,
    "orderedQuantity" | "receivedQuantity" | "unitCost" | "totalCost"
  > & {
    orderedQuantity: string;
    receivedQuantity: string | null;
    unitCost: string;
    totalCost: string;
    ingredient: { name: string; unit: string };
  })[];
};

interface PurchaseOrderTableProps {
  data: SerializedPurchaseOrder[];
  isLoading: boolean;
  onReceive: (poId: string) => void; // Callback to trigger receiving process
  // Add onEdit/onDelete later
}

const getStatusColor = (status: POStatus) => {
  switch (status) {
    case POStatus.DRAFT:
      return "gray";
    case POStatus.SUBMITTED:
      return "blue";
    case POStatus.APPROVED:
      return "cyan"; // Added color for APPROVED
    case POStatus.PARTIALLY_RECEIVED:
      return "orange";
    case POStatus.RECEIVED:
      return "green";
    case POStatus.CANCELLED:
      return "red";
    default:
      return "dark";
  }
};

// --- FIX: Explicitly type the array as POStatus[] ---
const receivableStatuses: POStatus[] = [
  POStatus.SUBMITTED,
  POStatus.PARTIALLY_RECEIVED,
  POStatus.APPROVED,
];
// ----------------------------------------------------

export function PurchaseOrderTable({
  data,
  isLoading,
  onReceive,
}: PurchaseOrderTableProps) {
  const rows = data.map((po) => {
    const totalAmountNum = po.totalAmount ? parseFloat(po.totalAmount) : 0;
    
    // --- FIX: Use the explicitly typed array for the .includes() check ---
    const canReceive = receivableStatuses.includes(po.status);

    return (
      <Table.Tr key={po.id}>
        <Table.Td>
          <Text fw={500}>{po.id.substring(0, 8)}...</Text> {/* Short ID */}
          <Text size="xs" c="dimmed">
            {dayjs(po.orderDate).format("DD/MM/YYYY")}
          </Text>
        </Table.Td>
        <Table.Td>{po.supplier?.name || "N/A"}</Table.Td>
        <Table.Td>{po.invoiceNumber || "N/A"}</Table.Td>
        <Table.Td>{po.items.length}</Table.Td>
        <Table.Td>
          <Text fw={500}>{formatCurrency(totalAmountNum)}</Text>
        </Table.Td>
        <Table.Td>
          <Badge color={getStatusColor(po.status)} variant="light">
            {po.status}
          </Badge>
        </Table.Td>
        <Table.Td>
          {po.expectedDeliveryDate
            ? dayjs(po.expectedDeliveryDate).format("DD/MM/YYYY")
            : "N/A"}
        </Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Receber Itens">
              <Button
                size="xs"
                variant="light"
                color="green"
                onClick={() => onReceive(po.id)}
                disabled={!canReceive} // Disable if not in correct status
                leftSection={<IconTruckDelivery size={14} />}
              >
                Receber
              </Button>
            </Tooltip>
            <Tooltip label="Ver Detalhes (Em breve)">
              <ActionIcon variant="subtle" color="blue" disabled>
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
            {/* Add Edit/Cancel later */}
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Table.ScrollContainer minWidth={900}>
      <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Pedido # / Data</Table.Th>
            <Table.Th>Fornecedor</Table.Th>
            <Table.Th>Nota Fiscal #</Table.Th>
            <Table.Th>Itens</Table.Th>
            <Table.Th>Valor Total</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Entrega Prevista</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Center h={200}>
                  <Loader />
                </Center>
              </Table.Td>
            </Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text ta="center" c="dimmed" py="lg">
                  Nenhuma ordem de compra encontrada.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}