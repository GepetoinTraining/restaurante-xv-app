// PATH: app/components/ui/NotificationBell.tsx
"use client";

import { ActionIcon, Text, Stack, Paper, ScrollArea, Group } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { useNotificationStore } from "@/lib/hooks/useNotificationStore";
import { StandardPopover } from "./StandardPopover";

export function NotificationBell() {
  const { notifications } = useNotificationStore();
  
  // The target is the bell icon
  const bellIcon = (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label="View notifications"
    >
      <IconBell stroke={1.5} />
      {/* You could add a red dot here if notifications.length > 0 */}
    </ActionIcon>
  );

  // The content is the list from localStorage
  const notificationList = (
    <ScrollArea h={300} w={350}>
      <Stack p="sm" gap="xs">
        {notifications.length === 0 ? (
          <Text c="dimmed" ta="center" p="md">
            Nenhuma notificação recente.
          </Text>
        ) : (
          notifications.map((n) => (
            <Paper withBorder p="xs" key={n.id} radius="sm">
              <Text fw={500} size="sm">{n.title}</Text>
              <Text size="xs">{n.message}</Text>
              <Text size="xs" c="dimmed" ta="right" mt={4}>
                {new Date(n.time).toLocaleString('pt-BR')}
              </Text>
            </Paper>
          ))
        )}
      </Stack>
    </ScrollArea>
  );

  return (
    <StandardPopover
      target={bellIcon}
      content={notificationList}
      position="bottom-end"
      shadow="md"
    />
  );
}