// PATH: app/dashboard/layout.tsx
"use client";

import { AppShell, Burger, Group, Skeleton, Image } from "@mantine/core";
import { useDisclosure } from '@mantine/hooks'; // Import useDisclosure
import { ModalsProvider } from '@mantine/modals';
import { MainNav } from "./components/MainNav";
import { Notifications } from "@mantine/notifications";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // Add disclosure hook for navbar state
  const [opened, { toggle }] = useDisclosure();

  return (
    <ModalsProvider>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 250,
          breakpoint: "sm",
          collapsed: { mobile: !opened }, // Control collapsed state based on hook
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            {/* Burger for mobile nav toggle */}
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm" // Hide burger on larger screens
              size="sm"
            />
            {/* Logo */}
            <Image src="/logo.jpg" alt="Acaia Logo" h={40} w="auto" fallbackSrc="https://placehold.co/100x40" />
            {/* Optional: Add user menu or other header items for larger screens here */}
            {/* Placeholder to keep logo centered-ish when burger is hidden */}
            <Box w={28} hiddenFrom="sm" />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          {/* MainNav remains the same */}
          <MainNav />
        </AppShell.Navbar>

        <AppShell.Main>
          {/* Notifications can stay here or move to RootLayout if needed globally */}
          {/* <Notifications position="top-right" /> */}
          {children}
        </AppShell.Main>
      </AppShell>
    </ModalsProvider>
  );
}

// Ensure Box is imported if not already
import { Box } from "@mantine/core";