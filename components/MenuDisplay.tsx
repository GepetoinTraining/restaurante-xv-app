// PATH: components/MenuDisplay.tsx
// Adjusted to expect deserialized product data

"use client";

import { ProductType } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Paper,
  Stack,
  Group,
  Badge,
} from "@mantine/core";
import { IconToolsKitchen2, IconGlassFull } from "@tabler/icons-react"; // Use Tabler icons
import React from "react";
// ---- START FIX ----
// Import SerializedProduct AND define DeserializedProduct locally or import if defined elsewhere
import { SerializedProduct } from "@/app/menu/[token]/page"; // Keep if needed for other parts, or remove

// Define the type with number price that this component actually uses
type DeserializedProduct = Omit<SerializedProduct, "price"> & {
  price: number;
};


// Define the props the component accepts using the DeserializedProduct type
interface MenuDisplayProps {
  products: DeserializedProduct[]; // Expect products with NUMBER prices
}
// ---- END FIX ----

export function MenuDisplay({ products }: MenuDisplayProps) {
  // Separate products into food and drink for display
  const foodItems = products.filter((p) => p.type === ProductType.FOOD);
  const drinkItems = products.filter((p) => p.type === ProductType.DRINK);
  // Remove 'OTHER' type as it's not in the new schema
  // const otherItems = products.filter(p => p.type === ProductType.OTHER);

  // Helper to render a list of products
  const renderProductList = (
    items: DeserializedProduct[], // Expect deserialized type here
    title: string,
    icon: React.ReactNode
  ) => (
    <Stack gap="md" key={title}>
      {" "}
      {/* Added key for list rendering */}
      <Group gap="xs">
        {icon}
        <Title order={3}>{title}</Title>
      </Group>
      {items.length === 0 ? (
        <Text c="dimmed">Nenhum item disponível nesta categoria.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {items.map((product) => (
            <Paper
              key={product.id}
              p="sm"
              withBorder
              radius="sm"
              shadow="xs"
            >
              <Group justify="space-between" align="flex-start">
                <Stack gap={0}>
                  <Text fw={500}>{product.name}</Text>
                  {/* Category field doesn't exist anymore, maybe use description? */}
                  {product.description && (
                    <Text size="xs" c="dimmed">
                      {product.description}
                    </Text>
                  )}
                </Stack>
                <Badge
                  variant="light"
                  color="teal" // Use a theme color
                  size="lg"
                  style={{ flexShrink: 0 }}
                >
                  {/* Price is already a NUMBER, no need for parseFloat */}
                  {formatCurrency(product.price || 0)}
                </Badge>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );

  return (
    <Stack gap="xl">
      {/* Render Menu Sections */}
      {renderProductList(
        foodItems,
        "Comidas",
        <IconToolsKitchen2 size={24} />
      )}
      {renderProductList(drinkItems, "Bebidas", <IconGlassFull size={24} />)}
      {/* Removed 'Other' section */}
      {/* {otherItems.length > 0 && renderProductList(otherItems, "Outros", <span />)} */}
    </Stack>
  );
}