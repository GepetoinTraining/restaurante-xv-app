// PATH: lib/hooks/useNotificationStore.ts
"use client";

import { useLocalStorage } from "@mantine/hooks";
import { 
  notifications as mantineNotifications, 
  NotificationData as NotificationsProps 
} from "@mantine/notifications";

// Define the shape of our stored item
interface StoredNotification {
  id: string;
  title: React.ReactNode;
  message: React.ReactNode;
  time: string; // ISO string
}

const MAX_STORED_NOTIFICATIONS = 10;

export function useNotificationStore() {
  const [storedNotifications, setStoredNotifications] = useLocalStorage<StoredNotification[]>({
    key: 'notification-history',
    defaultValue: [],
  });

  /**
   * Shows a real-time notification AND adds it to the persistent history.
   * This function takes the exact same object as mantineNotifications.show()
   */
  const addNotification = (props: NotificationsProps) => {
    // 1. Show the real-time "faded" toast notification
    mantineNotifications.show(props);

    // 2. Create the new item for localStorage
    const newItem: StoredNotification = {
      id: props.id || crypto.randomUUID(),
      title: props.title,
      message: props.message,
      time: new Date().toISOString(),
    };

    // 3. Update the persistent store
    setStoredNotifications((currentList) => {
      // Add new item to the front, then slice to keep only the last 10
      const updatedList = [newItem, ...currentList];
      return updatedList.slice(0, MAX_STORED_NOTIFICATIONS);
    });
  };

  return {
    /** The list of the 10 most recent notifications. */
    notifications: storedNotifications,
    /** Call this instead of notifications.show() */
    addNotification,
  };
}