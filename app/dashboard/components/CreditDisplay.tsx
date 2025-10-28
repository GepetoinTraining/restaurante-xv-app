"use client";

import { Paper, Text, Title } from "@mantine/core";

type CreditDisplayProps = {
  credit: number;
};

export function CreditDisplay({ credit }: CreditDisplayProps) {
  return (
    <Paper withBorder p="xl" radius="md" ta="center">
      <Title order={2} c="dimmed">
        Seu Crédito
      </Title>
      <Text fz={48} fw={700} c="green.7">
        R$ {credit.toFixed(2)}
      </Text>
      <Text c="dimmed">
        Este é o valor que você pode consumir na casa.
      </Text>
    </Paper>
  );
}
