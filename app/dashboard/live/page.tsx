// PATH: app/dashboard/live/page.tsx
// This is the refactored main page.

"use client";

import {
  Stack,
  LoadingOverlay,
  Alert,
  Grid,
  Title,
  Text,
} from "@mantine/core";
import { PageHeader } from "@/app/dashboard/components/PageHeader";
import { useState, useEffect } from "react";
import { ApiResponse } from "@/lib/types";
import { notifications } from "@mantine/notifications";
import { IconAlertCircle } from "@tabler/icons-react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

// Import the new types and components
import { LiveDataResponse } from "@/app/api/live/route";
import { ActiveVisits } from "./components/ActiveVisits";
import { PendingCalls } from "./components/PendingCalls";
import { RecentOrders } from "./components/RecentOrders";

// Create a client
const queryClient = new QueryClient();

// Helper to fetch live data
const fetchLiveData = async (): Promise<LiveDataResponse> => {
  const response = await fetch("/api/live");
  const data: ApiResponse<LiveDataResponse> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || "Failed to fetch live data");
};

// Main component wrapped in QueryClientProvider
export default function LivePageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <LivePage />
    </QueryClientProvider>
  );
}

// The actual page content
function LivePage() {
  // Use useQuery for data fetching and polling
  const { data, error, isLoading, isError, isFetching, refetch } =
    useQuery<LiveDataResponse>({
      queryKey: ["liveData"],
      queryFn: fetchLiveData,
      // Refetch every 15 seconds
      refetchInterval: 15000,
      refetchIntervalInBackground: true,
    });

  // Show error notification only once, not on every failed poll
  useEffect(() => {
    if (isError) {
      notifications.show({
        title: "Erro ao carregar dados ao vivo",
        message: (error as Error)?.message || "Erro desconhecido",
        color: "red",
        autoClose: 5000,
      });
    }
  }, [isError, error]);

  return (
    <Stack>
      <PageHeader title="Visão Geral Ao Vivo" />
      <Alert
        variant="light"
        color="blue"
        title="Atualização em Tempo Real"
        icon={<IconAlertCircle />}
      >
        <Text>
          Esta página atualiza automaticamente a cada 15 segundos.
          {/* Show a subtle loading indicator during background refetches */}
          {isFetching && !isLoading && (
            <Text span c="blue" fw={700} ml="xs">
              Atualizando...
            </Text>
          )}
        </Text>
      </Alert>

      {/* Show initial loading overlay */}
      <LoadingOverlay
        visible={isLoading}
        overlayProps={{ radius: "sm", blur: 1 }}
      />

      {/* Show persistent error message if initial load failed */}
      {isError && !data && (
        <Alert
          color="red"
          title="Falha ao Carregar Dados"
          icon={<IconAlertCircle />}
        >
          Não foi possível carregar os dados ao vivo. A página tentará
          recarregar automaticamente.
        </Alert>
      )}

      {/* Render dashboard layout if data exists */}
      {data && (
        <Grid>
          {/* Column 1: Server Calls (Most Important) */}
          <Grid.Col span={{ base: 12, md: 5, lg: 4 }}>
            <PendingCalls calls={data.pendingCalls} onRefresh={refetch} />
          </Grid.Col>

          {/* Column 2: Active Visits */}
          <Grid.Col span={{ base: 12, md: 7, lg: 5 }}>
            <ActiveVisits visits={data.activeVisits} />
          </Grid.Col>

          {/* Column 3: Recent Orders */}
          <Grid.Col span={{ base: 12, md: 12, lg: 3 }}>
            <RecentOrders orders={data.recentOrders} />
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}