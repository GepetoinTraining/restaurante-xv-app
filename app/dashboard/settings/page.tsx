// PATH: app/dashboard/settings/page.tsx
'use client';

import { Container, Title, Text, Paper, Stack } from '@mantine/core';
import { PageHeader } from '../components/PageHeader'; // Assuming PageHeader exists

export default function SettingsPage() {
  return (
    <Container fluid>
      <Stack>
        <PageHeader title="Configurações do Usuário" />
        <Paper withBorder p="xl" mt="lg">
          <Title order={3} ta="center">Configurações</Title>
          <Text c="dimmed" ta="center" mt="md">
            Opções de configuração do usuário aparecerão aqui. (Ex: Trocar PIN, preferências)
          </Text>
          {/* Placeholder for future settings components */}
        </Paper>
      </Stack>
    </Container>
  );
}