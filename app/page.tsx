import Link from 'next/link';
import { Container, Title, Text, Button, Stack, Paper, Image } from '@mantine/core';

// This is a Server Component by default (no "use client")
// It will be rendered entirely on the server.
export default function LandingPage() {
  return (
    <Container size="xs" style={{ height: '100vh' }}>
      <Stack justify="center" style={{ height: '100%' }}>
        <Paper withBorder shadow="xl" p="xl" radius="md">
          <Stack align="center" gap="lg">
            <Image src="/logo.jpg" alt="Acaia Logo" w={150} />
            <Title order={1} ta="center">
              Bem-vindo ao Acaia
            </Title>
            <Text c="dimmed" ta="center">
              Sistema de gerenciamento interno.
            </Text>
            {/* Link component provides client-side navigation */}
            <Button
                component={Link}
                href="/login"
                size="lg"
                color="pastelGreen"
            >
              Acesso Staff (Login)
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}

