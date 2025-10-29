// PATH: app/dashboard/layout.tsx
"use client";

import { AppShell, Burger, Group, Skeleton, Image, ActionIcon, useMantineColorScheme, Paper, Box } from "@mantine/core"; // Added Paper, Box
import { useDisclosure } from '@mantine/hooks';
import { ModalsProvider } from '@mantine/modals';
import { MainNav } from "./components/MainNav";
import { Notifications } from "@mantine/notifications";
import { ReactNode } from "react";
import { IconSun, IconMoon, IconUserCircle } from "@tabler/icons-react"; // Added IconUserCircle
import Link from "next/link"; // Added Link for navigation
import { NotificationBell } from "../../components/ui/NotificationBell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme(); 

  return (
    <ModalsProvider>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 250,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            {/* Left Side */}
            <Group>
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
              />
              <Image src="/logo.png" alt="Espaço XV Logo" h={40} w="auto" fallbackSrc="https://placehold.co/100x40" />
            </Group>

            {/* Right Side Icons */}
            <Group>
              <ActionIcon
                onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
                variant="default"
                size="lg"
                aria-label="Toggle color scheme"
              >
                {colorScheme === 'dark' ? <IconSun stroke={1.5} /> : <IconMoon stroke={1.5} />}
              </ActionIcon>
              
              <NotificationBell />

              {/* Settings Page Icon Link */}
              <Link href="/dashboard/settings" passHref>
                <ActionIcon
                  variant="default"
                  size="lg"
                  aria-label="User Settings"
                >
                  <IconUserCircle stroke={1.5} />
                </ActionIcon>
              </Link>
            </Group>

          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <MainNav />
        </AppShell.Navbar>

        {/* Main Content Area */}
        <AppShell.Main>
           <Paper withBorder p="md" shadow="xs" radius="md" style={{ minHeight: 'calc(100vh - 92px)' }}>
              {children}
            </Paper>
        </AppShell.Main>
      </AppShell>
    </ModalsProvider>
  );
}