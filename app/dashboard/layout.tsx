// app/dashboard/layout.tsx
"use client";

import { AppShell, Burger, Group, Skeleton } from "@mantine/core";
// ... other imports
import { ModalsProvider } from '@mantine/modals'; // Import ModalsProvider
import { MainNav } from "./components/MainNav";
import { Notifications } from "@mantine/notifications";
import { Image } from "@mantine/core";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // ... disclosure hooks if you bring them back ...

  return (
    <ModalsProvider> {/* Wrap AppShell with ModalsProvider */}
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 250,
          breakpoint: "sm",
        }}
        padding="md"
      >
        <AppShell.Header>
         {/* ... Header content ... */}
          {/* Use Acaia logo path */}
          <Image src="/logo.jpg" alt="Acaia Logo" w={100} fallbackSrc="https://placehold.co/100x40" />
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <MainNav />
        </AppShell.Navbar>

        <AppShell.Main>
          <Notifications position="top-right" />
          {children}
        </AppShell.Main>
      </AppShell>
    </ModalsProvider>
  );
}