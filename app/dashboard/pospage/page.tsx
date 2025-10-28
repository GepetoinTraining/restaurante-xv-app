// PATH: app/dashboard/pospage/page.tsx
"use client";

import { useState } from "react";
import {
  Container,
  Grid,
  Stack,
  Title,
  Button,
  Box,
  LoadingOverlay,
} from "@mantine/core";
import { Product } from "@prisma/client";
import { ProductSelector } from "./components/ProductSelector";
import { Cart, CartItem } from "./components/Cart";
import { SubmitOrderModal } from "./components/SubmitOrderModal";
import { notifications } from "@mantine/notifications";
import { ApiResponse } from "@/lib/types";
import { Order } from "@prisma/client";
import { PageHeader } from "../components/PageHeader";
import { VisitSelector } from "./components/VisitSelector"; // Import new selector
import { ActiveVisitResponse } from "@/app/api/visits/active/route"; // Import type
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"; // Add QueryClient

// Create a client
const queryClient = new QueryClient();

// The product from the API has 'price' as a string
export type ProductWithSerializedPrice = Omit<Product, "price"> & {
  price: string;
};

// Main POS component wrapped in QueryClientProvider
export default function PosPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PosPageContent />
    </QueryClientProvider>
  );
}

// The actual page content
function PosPageContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedVisit, setSelectedVisit] =
    useState<ActiveVisitResponse | null>(null); // Use Visit type
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addToCart = (product: ProductWithSerializedPrice) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        // Increment quantity
        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item
        return [...currentCart, { product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.product.id !== productId)
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart((currentCart) =>
        currentCart.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedVisit(null); // Also clear the selected visit
  };

  const handleSubmitOrder = async () => {
    if (!selectedVisit) {
      notifications.show({
        title: "Erro",
        message: "Nenhuma visita selecionada",
        color: "red",
      });
      return;
    }
    if (cart.length === 0) {
      notifications.show({
        title: "Erro",
        message: "O carrinho está vazio",
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const orderData = {
        visitId: selectedVisit.id, // Pass the visitId
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      };

      // Post to the new /api/orders route
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data: ApiResponse<Order> = await response.json();

      if (data.success) {
        notifications.show({
          title: "Sucesso!",
          message: "Pedido criado com sucesso.",
          color: "green",
        });
        clearCart();
        setIsModalOpen(false);
      } else {
        notifications.show({
          title: "Erro ao criar pedido",
          message: data.error || "Não foi possível salvar o pedido",
          color: "red",
        });
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Erro de Rede",
        message: "Não foi possível conectar ao servidor",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = cart.length > 0 && selectedVisit !== null;

  return (
    <Container fluid>
      <Box pos="relative">
        <LoadingOverlay visible={isSubmitting} />
        <Stack gap="lg">
          <PageHeader title="Ponto de Venda (PDV)" />
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 7, lg: 8 }}>
              <ProductSelector onProductSelect={addToCart} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
              <Stack>
                {/* Replace SeatingAreaSelector with VisitSelector */}
                <VisitSelector
                  selectedVisit={selectedVisit}
                  onVisitSelect={setSelectedVisit}
                />
                <Cart
                  items={cart}
                  onRemove={removeFromCart}
                  onUpdateQuantity={updateQuantity}
                />
                <Button
                  size="lg"
                  onClick={() => setIsModalOpen(true)}
                  disabled={!canSubmit}
                >
                  Revisar Pedido
                </Button>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      </Box>

      <SubmitOrderModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitOrder}
        cart={cart}
        isSubmitting={isSubmitting}
        // Pass the selected visit (or null) to the modal
        visit={selectedVisit}
      />
    </Container>
  );
}