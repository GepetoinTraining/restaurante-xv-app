// PATH: app/dashboard/products/components/ProductTable.tsx
// NOTE: We are modifying this existing file to add the new button.

"use client";

import {
  Table,
  Badge,
  ActionIcon,
  Tooltip,
  Text,
  Loader,
  Button, // Import Button
} from "@mantine/core";
import {
  IconPencil,
  IconTrash,
  IconToolsKitchen2, // Import Recipe icon
} from "@tabler/icons-react";
import { ProductType } from "@prisma/client";
import { ProductWithWorkstation } from "../page";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react"; // Import useState
import { ManageRecipeModal } from "./ManageRecipeModal"; // Import the new modal

interface ProductTableProps {
  data: ProductWithWorkstation[];
  isLoading: boolean;
  onRefresh: () => void;
  // TODO: Add onEdit and onDelete handlers
}

// Helper function to format ProductType
const formatProductType = (type: ProductType) => {
  switch (type) {
    case ProductType.FOOD:
      return "Comida";
    case ProductType.DRINK:
      return "Bebida";
    default:
      return type;
  }
};

export function ProductTable({
  data,
  isLoading,
  onRefresh,
}: ProductTableProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithWorkstation | null>(null);

  const handleOpenRecipeModal = (product: ProductWithWorkstation) => {
    setSelectedProduct(product);
  };

  const handleCloseRecipeModal = () => {
    setSelectedProduct(null);
  };

  const rows = data.map((product) => {
    return (
      <Table.Tr key={product.id}>
        <Table.Td>{product.name}</Table.Td>
        <Table.Td>{product.description || "N/A"}</Table.Td>
        <Table.Td>
          {formatCurrency(parseFloat(product.price as any))}
        </Table.Td>
        <Table.Td>
          <Badge color={product.type === ProductType.DRINK ? "blue" : "orange"}>
            {formatProductType(product.type)}
          </Badge>
        </Table.Td>
        <Table.Td>
          {product.prepStation ? (
            <Badge color="gray">{product.prepStation.name}</Badge>
          ) : (
            "N/A"
          )}
        </Table.Td>
        <Table.Td>
          {/* ADDED THIS TOOLTIP AND BUTTON */}
          <Tooltip label="Gerenciar Receita">
            <ActionIcon
              variant="transparent"
              color="cyan"
              onClick={() => handleOpenRecipeModal(product)}
            >
              <IconToolsKitchen2 size={18} />
            </ActionIcon>
          </Tooltip>
          {/* END OF ADDITION */}
          <Tooltip label="Editar">
            <ActionIcon variant="transparent" color="blue">
              <IconPencil size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remover">
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
    <>
      <Table.ScrollContainer minWidth={700}>
        <Table verticalSpacing="sm" striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Descrição</Table.Th>
              <Table.Th>Preço</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Estação de Preparo</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center">Nenhum produto encontrado</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      {/* ADDED THIS MODAL */}
      <ManageRecipeModal
        opened={!!selectedProduct}
        onClose={handleCloseRecipeModal}
        product={selectedProduct}
      />
    </>
  );
}