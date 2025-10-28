// PATH: app/dashboard/promotions/components/PromotionTable.tsx
"use client";

import { Table, Badge, ActionIcon, Tooltip, Text, Loader, Group } from "@mantine/core";
import { IconPencil, IconTrash, IconPercentage, IconCurrencyReal } from "@tabler/icons-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PromotionWithProduct } from "../page"; // Import the type from page.tsx
import { formatCurrency } from "@/lib/utils";

// Re-define placeholder DiscountType enum if needed (matching page.tsx)
enum DiscountType {
    PERCENTAGE = "PERCENTAGE",
    FIXED = "FIXED",
}

interface PromotionTableProps {
  promotions: PromotionWithProduct[];
  loading: boolean;
  // Add handlers for actions later if needed
  // onEdit: (promotion: PromotionWithProduct) => void;
  // onDelete: (promotionId: string | number) => void;
}

export function PromotionTable({ promotions, loading }: PromotionTableProps) {
  const rows = promotions.map((promo) => {
    const isPercentage = promo.discountType === DiscountType.PERCENTAGE;
    const discountValueDisplay = isPercentage
      ? `${promo.discountValue}%`
      : formatCurrency(promo.discountValue);
    const startDateFormatted = format(new Date(promo.startDate), 'dd/MM/yy', { locale: ptBR });
    const endDateFormatted = promo.endDate ? format(new Date(promo.endDate), 'dd/MM/yy', { locale: ptBR }) : 'Sem Fim';

    // Determine status based on dates and isActive flag
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = promo.endDate ? new Date(promo.endDate) : null;
    let status: 'Ativa' | 'Agendada' | 'Expirada' | 'Inativa' = 'Inativa';
    let statusColor = 'gray';

    if (promo.isActive) {
      if (start > now) {
        status = 'Agendada';
        statusColor = 'blue';
      } else if (!end || end >= now) {
        status = 'Ativa';
        statusColor = 'green';
      } else {
        status = 'Expirada';
        statusColor = 'orange';
      }
    }

    return (
      <Table.Tr key={promo.id}>
        <Table.Td>
            <Text fw={500}>{promo.name || promo.title || `Promoção #${promo.id}`}</Text>
             {/* Display bonusOffer or body if name/title missing */}
            {(promo.body || promo.bonusOffer) && <Text size="xs" c="dimmed">{promo.body || promo.bonusOffer}</Text>}
        </Table.Td>
        <Table.Td>{promo.product?.name || "N/A"}</Table.Td>
        <Table.Td>
            <Group gap="xs">
                {isPercentage ? <IconPercentage size={14}/> : <IconCurrencyReal size={14} />}
                <Text>{discountValueDisplay}</Text>
            </Group>
        </Table.Td>
        <Table.Td>{startDateFormatted}</Table.Td>
        <Table.Td>{endDateFormatted}</Table.Td>
        <Table.Td>
            <Badge color={statusColor} variant="light">{status}</Badge>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Tooltip label="Editar (Em breve)">
              <ActionIcon variant="transparent" color="blue" disabled>
                <IconPencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Desativar/Excluir (Em breve)">
              <ActionIcon variant="transparent" color="red" disabled>
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  });

  if (loading) {
    return <Loader />;
  }

  return (
    <Table.ScrollContainer minWidth={800}>
      <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome / Descrição</Table.Th>
            <Table.Th>Produto</Table.Th>
            <Table.Th>Desconto</Table.Th>
            <Table.Th>Início</Table.Th>
            <Table.Th>Fim</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text ta="center" c="dimmed" my="md">
                    {loading ? '' : 'Nenhuma promoção encontrada.'}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}