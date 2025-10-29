// PATH: app/components/ui/FormModal.tsx
"use client";

import { Modal, Group, Button, Stack, LoadingOverlay, ModalProps } from "@mantine/core";
import { ReactNode } from "react";

// Extend ModalProps to allow passing size, centered, etc.
interface FormModalProps extends Omit<ModalProps, 'children' | 'onSubmit'> {
  title: string;
  children: ReactNode; // This is where the form fields will go
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  submitButtonLabel?: string;
  cancelButtonLabel?: string;
}

export function FormModal({
  opened,
  onClose,
  title,
  children,
  onSubmit,
  isLoading,
  submitButtonLabel = "Salvar",
  cancelButtonLabel = "Cancelar",
  ...props // Pass down other modal props
}: FormModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} centered {...props}>
      <form onSubmit={onSubmit}>
        <LoadingOverlay visible={isLoading} />
        <Stack>
          {children} {/* Form inputs like TextInput, Select, etc. go here */}
          
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose} disabled={isLoading}>
              {cancelButtonLabel}
            </Button>
            <Button type="submit" loading={isLoading}>
              {submitButtonLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}