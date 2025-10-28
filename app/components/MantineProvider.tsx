"use client";

import { theme } from "@/lib/theme";
import { MantineProvider as CoreMantineProvider } from "@mantine/core";

export function MantineProvider({ children }: { children: React.ReactNode }) {
  return (
    <CoreMantineProvider theme={theme} defaultColorScheme="dark">
      {children}
    </CoreMantineProvider>
  );
}
