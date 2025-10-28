// PATH: app/dashboard/financials/components/PurchaseOrderReceiving.tsx

'use client';

import {
  Title,
  Stack,
  Paper,
  LoadingOverlay,
  Alert,
  Table,
  Group,
  Badge,
  Button,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { IconCheck, IconExclamationCircle, IconTruck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { PurchaseOrderWithDetails } from '@/lib/types';
import { POStatus, PurchaseOrder } from '@prisma/client';

type ErrorResponse = { error: string };

export function PurchaseOrderReceiving() {
  const queryClient = useQueryClient();

  // 1. Fetch POs that are "Submitted" or "Approved"
  const {
    data: pendingPOs,
    isLoading,
    isError,
    error,
  } = useQuery<PurchaseOrderWithDetails[]>({
    queryKey: ['purchaseOrders', 'pending'],
    queryFn: () =>
      axios
        .get('/api/purchase-orders?status=SUBMITTED&status=APPROVED')
        .then((res) => res.data),
  });

  // 2. Mutation to update the PO status to "RECEIVED"
  const { mutate: receiveOrder, isPending: isReceiving } = useMutation<
    PurchaseOrder,
    AxiosError<ErrorResponse>,
    { poId: string }
  >({
    mutationFn: ({ poId }) =>
      axios
        .patch(`/api/purchase-orders/${poId}/status`, {
          status: POStatus.RECEIVED,
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      notifications.show({
        title: 'Order Received',
        message: `PO ${data.id.substring(0, 8)}... marked as RECEIVED.`,
        color: 'green',
        icon: <IconCheck />,
      });
      // Refetch pending POs and the financial report
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['financialReport'] });
    },
    onError: (error) => {
      notifications.show({
        title: 'Error Receiving Order',
        message:
          error.response?.data?.error || 'An unknown error occurred.',
        color: 'red',
        icon: <IconExclamationCircle />,
      });
    },
  });

  const rows = pendingPOs?.map((po) => (
    <Table.Tr key={po.id}>
      <Table.Td>{po.supplier.name}</Table.Td>
      <Table.Td>
        {new Date(po.expectedDeliveryDate || po.orderDate).toLocaleDateString()}
      </Table.Td>
      <Table.Td>
        <Badge>{po.status}</Badge>
      </Table.Td>
      <Table.Td>
        R$ {po.totalCost?.toString() || 'N/A'}
      </Table.Td>
      <Table.Td>
        <Button
          leftSection={<IconCheck size={16} />}
          color="green"
          size="xs"
          loading={isReceiving}
          onClick={() => receiveOrder({ poId: po.id })}
        >
          Mark as Received
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper shadow="md" p="lg" withBorder pos="relative">
      <LoadingOverlay visible={isLoading} />
      <Stack>
        <Title order={3}>Pending Purchase Orders</Title>
        {isError && (
          <Alert color="red" title="Error">
            {error?.message || 'Failed to fetch pending POs'}
          </Alert>
        )}
        {pendingPOs?.length === 0 && (
          <Alert icon={<IconTruck size={16} />} color="gray">
            No pending purchase orders found.
          </Alert>
        )}
        {pendingPOs && pendingPOs.length > 0 && (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Supplier</Table.Th>
                <Table.Th>Expected Date</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Total Cost</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}