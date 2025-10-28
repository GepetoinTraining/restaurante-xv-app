// PATH: app/about/layout.tsx
// ---- START FIX: Add 'use client' because Mantine components are used ----
'use client'; 
// ---- END FIX ----

import { AppShell, Burger, Container, Group, Text, Button } from '@mantine/core'; // Added Text, Button
import Link from 'next/link';

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      header={{ height: 60 }}
      padding="md"
    >
      <AppShell.Header>
        <Container size="md" h="100%">
            <Group h="100%" px="md" justify='space-between'>
                <Text fw={700} size="xl" component={Link} href="/about">
                    Sobre o App
                </Text>
                <Button component={Link} href="/login" variant='light'>
                    Ir para o Login
                </Button>
            </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="md" pt="lg">
            {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}