// PATH: components/StatCard.tsx
"use client";

import { Paper, Group, Text } from "@mantine/core";
import {
  DollarSign,
  TrendingUp,
  User,
  Users,
  Package,
} from "lucide-react";
import classes from "./StatCard.module.css"; // Assuming you have a CSS module

// Define the icons map
const icons = {
  dollars: DollarSign, // Corrected key from previous step
  average: TrendingUp,
  visits: User,
  staff: Users,
  product: Package,
};

// Define prop types
interface StatCardProps {
  title: string;
  value: string;
  icon: keyof typeof icons; 
}

export function StatCard({ title, value, icon }: StatCardProps) {
  const Icon = icons[icon];

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <Text size="xs" c="dimmed" className={classes.title}>
          {title}
        </Text>
        {/* ---- START FIX: Pass stroke as a string ---- */}
        <Icon className={classes.icon} size="1.4rem" stroke="1.5" /> 
        {/* ---- END FIX ---- */}
      </Group>

      <Group align="flex-end" gap="xs" mt={25}>
        <Text className={classes.value}>{value}</Text>
        {/* Example diff section if needed later */}
      </Group>

      <Text fz="xs" c="dimmed" mt={7}>
        Comparado com o mês anterior
      </Text>
    </Paper>
  );
}