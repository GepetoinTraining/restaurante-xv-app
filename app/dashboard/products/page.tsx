// PATH: app/dashboard/products/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Button, Container, Stack } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { Product, Workstation } from "@prisma/client"; // Import Prisma types
import { PageHeader } from "../components/PageHeader";
import { ProductTable } from "./components/ProductTable";
import { CreateProductModal } from "./components/CreateProductModal";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";

// Define a type for Product with its prepStation (Workstation) included
export type ProductWithWorkstation = Product & {
  prepStation: Workstation;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithWorkstation[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]); // To pass to modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products");
      const data: ApiResponse<ProductWithWorkstation[]> = await response.json();
      if (data.success && data.data) {
        setProducts(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar produtos",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch products error:", error);
      notifications.show({
        title: "Erro",
        message: "Falha ao carregar produtos",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkstations = async () => {
    try {
      // Fetch from the new API route
      const response = await fetch("/api/workstations");
      const data: ApiResponse<Workstation[]> = await response.json();
      if (data.success && data.data) {
        setWorkstations(data.data);
      } else {
        notifications.show({
          title: "Erro",
          message: data.error || "Falha ao carregar estações de trabalho",
          color: "red",
        });
      }
    } catch (error) {
      console.error("Fetch workstations error:", error);
      notifications.show({
        title: "Erro",
        message: "Falha ao carregar estações de trabalho",
        color: "red",
      });
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWorkstations(); // Fetch workstations when component mounts
  }, []);

  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Produtos" />
        <Button
          leftSection={<IconPlus size={14} />}
          onClick={() => setIsModalOpen(true)}
          w={200}
        >
          Novo Produto
        </Button>
        <ProductTable
          data={products}
          isLoading={isLoading}
          onRefresh={fetchProducts}
        />
      </Stack>
      <CreateProductModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchProducts();
        }}
        workstations={workstations} // Pass the workstation list
      />
    </Container>
  );
}