"use client";

import { Paper, Text, Group, ThemeIcon } from "@mantine/core";
import {
  DollarSign,
  Users,
  TrendingUp,
  UserCheck,
  Package,
} from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  icon: "dollar" | "average" | "visits" | "staff" | "product";
};

const icons = {
  dollar: DollarSign,
  average: TrendingUp,
  visits: Users,
  staff: UserCheck,
  product: Package,
};

export function StatCard({ title, value, icon }: StatCardProps) {
  const Icon = icons[icon];

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {title}
        </Text>
        <ThemeIcon color="privacyGold" variant="light" size={28} radius="md">
          <Icon size={16} />
        </ThemeIcon>
      </Group>
      <Text fz={28} fw={700} mt="sm">
        {value}
      </Text>
    </Paper>
  );
}
