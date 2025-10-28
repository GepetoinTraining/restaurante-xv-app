// PATH: app/dashboard/invoices/page.tsx
"use client"; // This page will contain client components

import { Container, Stack, Title, Text } from "@mantine/core";
import { PageHeader } from "../components/PageHeader";
import { InvoiceImportSimulation } from "./components/InvoiceImportSimulation"; // Import the simulation component
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client for react-query
const queryClient = new QueryClient();

// Wrapper for React Query
export default function InvoicesPageWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <InvoicesPage/>
        </QueryClientProvider>
    );
}


function InvoicesPage() {
  return (
    <Container fluid>
      <Stack gap="lg">
        <PageHeader title="Entrada de Notas / Invoices" />
        <Text c="dimmed" size="sm">
            Esta seção simula o recebimento de uma nota fiscal (invoice) de um fornecedor.
            No futuro, permitirá o upload de arquivos ou integração direta.
        </Text>
        {/* Render the simulation component */}
        <InvoiceImportSimulation />
      </Stack>
    </Container>
  );
}