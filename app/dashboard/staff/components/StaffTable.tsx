// PATH: app/dashboard/staff/components/StaffTable.tsx
"use client";

import { Table, Badge, ActionIcon, Tooltip, Text, Loader } from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { Role } from "@prisma/client"; // Import Role enum
import { UserWithWorkstation } from "../page"; // Import the extended type

interface StaffTableProps {
  data: UserWithWorkstation[];
  isLoading: boolean;
  onRefresh: () => void;
  // TODO: Add onEdit and onDelete handlers
}

// Helper function to format the Role enum
const formatRole = (role: Role) => {
  switch (role) {
    case Role.SERVER:
      return "Garçom";
    case Role.BARTENDER:
      return "Bartender";
    case Role.COOK:
      return "Cozinha";
    case Role.CASHIER:
      return "Caixa";
    case Role.DJ:
      return "DJ";
    case Role.MANAGER:
      return "Gerente";
    case Role.OWNER:
      return "Proprietário";
    default:
      return role;
  }
};

// Helper function to get a color for the role badge
const getRoleColor = (role: Role) => {
  switch (role) {
    case Role.OWNER:
      return "red";
    case Role.MANAGER:
      return "orange";
    case Role.CASHIER:
      return "yellow";
    case Role.BARTENDER:
      return "cyan";
    case Role.COOK:
      return "grape";
    case Role.SERVER:
      return "blue";
    case Role.DJ:
      return "pink";
    default:
      return "gray";
  }
};

export function StaffTable({ data, isLoading, onRefresh }: StaffTableProps) {
  const rows = data.map((user) => {
    // The workstation name is now directly available
    const workstationName = user.workstation ? user.workstation.name : "N/A";

    return (
      <Table.Tr key={user.id}>
        <Table.Td>{user.name}</Table.Td>
        <Table.Td>{user.email}</Table.Td>
        <Table.Td>
          <Badge color={getRoleColor(user.role)}>
            {formatRole(user.role)}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Badge color={user.isActive ? "green" : "gray"}>
            {user.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </Table.Td>
        <Table.Td>{workstationName}</Table.Td>
        <Table.Td>
          <Tooltip label="Editar">
            <ActionIcon variant="transparent" color="blue">
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Desativar">
            <ActionIcon variant="transparent" color="red">
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    );
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Table.ScrollContainer minWidth={700}>
      <Table verticalSpacing="sm" striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nome</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Função</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Estação</Table.Th>
            <Table.Th>Ações</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={6}>
                <Text ta="center">Nenhum membro da equipe encontrado</Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}