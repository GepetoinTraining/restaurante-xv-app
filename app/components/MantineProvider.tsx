// PATH: app/components/MantineProvider.tsx
"use client";

import { theme } from "@/lib/theme";
import { MantineProvider as CoreMantineProvider } from "@mantine/core";

export function MantineProvider({ children }: { children: React.ReactNode }) {
  return (
    // Correctly applies the theme object and sets dark mode default
    <CoreMantineProvider theme={theme} defaultColorScheme="dark">
      {children}
    </CoreMantineProvider>
  );
}