// PATH: app/dashboard/company-clients/components/CompanyClientTable.tsx
"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Group,
  Anchor,
  Center, // Import Center
} from "@mantine/core";
import { IconPencil, IconTrash, IconEye, IconMapPin } from "@tabler/icons-react";
import { CompanyClient, SalesPipelineStage } from "@prisma/client"; // Use Prisma types here
import Link from "next/link";
import { formatCurrency } from "@/lib/utils"; // If needed later for value/deal size

// Type expected by this component (serialized data from API + ID)
export type SerializedCompanyClientWithId = Omit<CompanyClient, 'consumptionFactor' | 'latitude' | 'longitude'> & {
    id: string;
    consumptionFactor: string;
    latitude: number | null;
    longitude: number | null;
};


interface CompanyClientTableProps {
  data: SerializedCompanyClientWithId[];
  isLoading: boolean;
  onEdit: (client: SerializedCompanyClientWithId) => void;
  onDelete: (id: string) => void;
}

// Helper to format SalesPipelineStage
const formatSalesStage = (stage: SalesPipelineStage) => {
    switch(stage) {
        case SalesPipelineStage.LEAD: return 'Lead';
        case SalesPipelineStage.CONTACTED: return 'Contactado';
        case SalesPipelineStage.PROPOSAL: return 'Proposta';
        case SalesPipelineStage.NEGOTIATION: return 'Negociação';
        case SalesPipelineStage.CLOSED_WON: return 'Fechado Ganho';
        case SalesPipelineStage.CLOSED_LOST: return 'Fechado Perdido';
        default: return stage;
    }
};
const getSalesStageColor = (stage: SalesPipelineStage) => {
     switch(stage) {
        case SalesPipelineStage.LEAD: return 'gray';
        case SalesPipelineStage.CONTACTED: return 'blue';
        case SalesPipelineStage.PROPOSAL: return 'cyan';
        case SalesPipelineStage.NEGOTIATION: return 'orange';
        case SalesPipelineStage.CLOSED_WON: return 'green';
        case SalesPipelineStage.CLOSED_LOST: return 'red';
        default: return 'dark';
    }
}


export function CompanyClientTable({ data, isLoading, onEdit, onDelete }: CompanyClientTableProps) {
  const rows = data.map((client) => {
    const consumptionFactorNum = parseFloat(client.consumptionFactor);
    return (
      <Table.Tr key={client.id}>
        <Table.Td>
          <Anchor
            component={Link} // Use Next.js Link for client-side navigation
            href={`/dashboard/company-clients/${client.id}`} // Link to detail page
            size="sm"
            fw={500}
          >
            {client.companyName}
          </Anchor>
          {client.addressCity && <Text size="xs" c="dimmed">{client.addressCity}</Text>}
        </Table.Td>
        <Table.Td>{client.contactPerson || "N/A"}</Table.Td>
        <Table.Td>{client.phone}</Table.Td>
        <Table.Td>{client.employeeCount ?? 'N/A'}</Table.Td>
        <Table.Td>
            <Badge variant="outline" color={consumptionFactorNum !== 1 ? 'yellow' : 'gray'}>
                x{consumptionFactorNum.toFixed(2)}
            </Badge>
        </Table.Td>
         <Table.Td>
            <Badge color={getSalesStageColor(client.salesPipelineStage)} variant="light">
                {formatSalesStage(client.salesPipelineStage)}
            </Badge>
         </Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label="Ver Detalhes">
              <ActionIcon
                variant="subtle"
                color="blue"
                component={Link}
                href={`/dashboard/company-clients/${client.id}`}
              >
                <IconEye size={16} />
              </ActionIcon>
            </Tooltip>
             <Tooltip label="Editar Cliente">
              <ActionIcon variant="subtle" color="yellow" onClick={() => onEdit(client)}>
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
             <Tooltip label="Excluir Cliente">
              <ActionIcon variant="subtle" color="red" onClick={() => onDelete(client.id)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
            {/* TODO: Add Map Icon if lat/lon exist? */}
            {/* {client.latitude && client.longitude && (
                <Tooltip label="Ver no Mapa">
                    <ActionIcon variant="subtle" color="teal">
                        <IconMapPin size={16}/>
                    </ActionIcon>
                </Tooltip>
            )} */}
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
            <Table.Th>Empresa</Table.Th>
            <Table.Th>Contato</Table.Th>
            <Table.Th>Telefone</Table.Th>
            <Table.Th>Funcionários</Table.Th>
            <Table.Th>Fator Consumo</Table.Th>
            <Table.Th>Estágio Venda</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {isLoading ? (
             <Table.Tr><Table.Td colSpan={7}><Center h={200}><Loader /></Center></Table.Td></Table.Tr>
          ) : rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={7}>
                <Text ta="center" c="dimmed" py="lg">Nenhum cliente B2B encontrado.</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
