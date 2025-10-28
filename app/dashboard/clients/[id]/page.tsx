// PATH: app/dashboard/clients/[id]/page.tsx
"use client";

import {
  Container,
  Stack,
  Loader,
  Alert,
  Grid,
  Breadcrumbs,
  Anchor,
  Box,
  Text // Added Text here
} from "@mantine/core";
import { PageHeader } from "../../components/PageHeader";
import { IconAlertCircle, IconChevronRight } from "@tabler/icons-react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { ApiResponse } from "@/lib/types";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";

// Import new components
import { ClientHeader } from "./components/ClientHeader";
import { ClientHistory } from "./components/ClientHistory";

// Define the type for the API response
// This matches the complex type from '/api/clients/[id]/route.ts'
// Note: All Decimals are strings here!
export type ClientDetailsResponse = any; // Using 'any' for simplicity, could be typed fully

// Helper to fetch client details
const fetchClientDetails = async (
  id: string
): Promise<ClientDetailsResponse> => {
  const response = await fetch(`/api/clients/${id}`);
  if (response.status === 404) {
    notFound();
  }
  const data: ApiResponse<ClientDetailsResponse> = await response.json();
  if (data.success && data.data) {
    return data.data;
  }
  throw new Error(data.error || "Failed to fetch client details");
};

// Create a client
const queryClient = new QueryClient();

// Main component wrapped in QueryClientProvider
export default function ClientDetailPageWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientDetailPage />
    </QueryClientProvider>
  );
}

function ClientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const {
    data: client,
    error,
    isLoading,
    isError,
    refetch,
  } = useQuery<ClientDetailsResponse>({
    queryKey: ["clientDetails", id],
    queryFn: () => fetchClientDetails(id),
  });

  const breadcrumbs = (
    <Breadcrumbs separator={<IconChevronRight size={14} />}>
      <Anchor component={Link} href="/dashboard/clients">
        Clientes
      </Anchor>
      <Text>{isLoading ? "Carregando..." : client?.name || "Detalhes"}</Text> {/* This Text component will now work */}
    </Breadcrumbs>
  );

  if (isLoading) {
    return (
      <Container fluid>
        <Stack>
          {breadcrumbs}
          <Loader />
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container fluid>
        <Stack>
          {breadcrumbs}
          <Alert
            color="red"
            title="Falha ao Carregar Cliente"
            icon={<IconAlertCircle />}
          >
            {(error as Error)?.message || "Erro desconhecido"}
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container fluid>
      <Stack gap="lg">
        {breadcrumbs}
        <Grid>
          {/* Column 1: Client Header & Wallet */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <ClientHeader client={client} onRefresh={refetch} />
          </Grid.Col>

          {/* Column 2: History (Visits, Orders, Transactions) */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <ClientHistory client={client} />
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}