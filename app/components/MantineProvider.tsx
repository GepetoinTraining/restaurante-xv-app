// File: app/components/MantineProvider.tsx
"use client";

import { MantineProvider } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/lib/theme";

// --- FIX: Import QueryClient ---
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// ------------------------------

export function AppMantineProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // --- FIX: Create a QueryClient instance ---
  const [queryClient] = useState(() => new QueryClient());
  // ----------------------------------------

  return (
    // --- FIX: Wrap everything in QueryClientProvider ---
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <Notifications />
        <ModalsProvider>{children}</ModalsProvider>
      </MantineProvider>
    </QueryClientProvider>
    // -------------------------------------------------
  );
}