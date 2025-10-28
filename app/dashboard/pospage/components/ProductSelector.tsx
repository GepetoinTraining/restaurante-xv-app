// PATH: app/dashboard/pospage/components/ProductSelector.tsx
"use client";

import { useState, useEffect } from "react";
import {
  SimpleGrid,
  Card,
  Text,
  Badge,
  Group,
  TextInput,
  Loader,
  Paper,
  Image,
  Stack,
} from "@mantine/core";
import { ApiResponse } from "@/lib/types";
import { ProductWithSerializedPrice } from "../page"; // Import updated type
import { formatCurrency } from "@/lib/utils";
import { IconSearch } from "@tabler/icons-react";

interface ProductSelectorProps {
  onProductSelect: (product: ProductWithSerializedPrice) => void;
}

export function ProductSelector({ onProductSelect }: ProductSelectorProps) {
  const [products, setProducts] = useState<ProductWithSerializedPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/products");
        const data: ApiResponse<ProductWithSerializedPrice[]> =
          await response.json();
        if (data.success && data.data) {
          setProducts(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Paper
        p="lg"
        style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
      >
        <Loader />
      </Paper>
    );
  }

  return (
    <Stack>
      <TextInput
        placeholder="Buscar produto..."
        leftSection={<IconSearch size={14} />}
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.currentTarget.value)}
      />
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
        {filteredProducts.map((product) => (
          <Card
            shadow="sm"
            padding="sm"
            radius="md"
            withBorder
            key={product.id}
            onClick={() => onProductSelect(product)}
            style={{ cursor: "pointer" }}
          >
            <Card.Section>
              <Image
                src={product.imageUrl || "/placeholder.jpg"}
                height={100}
                alt={product.name}
              />
            </Card.Section>

            <Text fw={500} size="sm" mt="md" truncate>
              {product.name}
            </Text>

            <Group justify="space-between" mt="xs" mb="xs">
              <Text size="md" fw={700}>
                {/* Price is a string, so parse it */}
                {formatCurrency(parseFloat(product.price))}
              </Text>
              <Badge color={product.type === "DRINK" ? "blue" : "orange"}>
                {product.type}
              </Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  );
}