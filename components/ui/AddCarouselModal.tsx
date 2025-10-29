// PATH: app/components/ui/AddCarouselModal.tsx
"use client";

import { Modal, Group, Button, Stack, ModalProps, Paper, Text, Textarea, FileInput, ActionIcon, Image, Box } from "@mantine/core";
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';
import { IconPlus, IconTrash, IconFile } from '@tabler/icons-react';

/** The internal state for managing a slide */
interface SlideInput {
  id: string; // for key
  file: File | null;
  description: string;
  previewUrl: string | null;
}

/** The final data passed back on submit */
export interface CarouselOutput {
  files: (File | null)[]; // Array of files, in order
  descriptions: string[]; // Array of descriptions, in order
}

interface AddCarouselModalProps extends Omit<ModalProps, 'children' | 'onSubmit'> {
  title: string;
  onSubmit: (output: CarouselOutput) => void;
  isLoading?: boolean; // Pass in loading state
}

export function AddCarouselModal({
  opened,
  onClose,
  title,
  onSubmit,
  isLoading = false,
  ...props
}: AddCarouselModalProps) {
  
  const [slides, setSlides] = useState<SlideInput[]>([]);
  
  // The form for adding a *new* step
  const form = useForm({
    initialValues: {
      file: null as File | null,
      description: '',
    },
  });

  const handleAddStep = (values: typeof form.values) => {
    const newSlide: SlideInput = {
      id: crypto.randomUUID(),
      file: values.file,
      description: values.description,
      previewUrl: values.file ? URL.createObjectURL(values.file) : null
    };
    setSlides((current) => [...current, newSlide]);
    form.reset();
  };

  const handleRemoveStep = (id: string) => {
    // Revoke object URL to prevent memory leaks
    const slide = slides.find(s => s.id === id);
    if (slide?.previewUrl) {
      URL.revokeObjectURL(slide.previewUrl);
    }
    setSlides((current) => current.filter(slide => slide.id !== id));
  };

  const handleSubmit = () => {
    // Process the state into the final output
    const output: CarouselOutput = {
      files: slides.map(s => s.file),
      descriptions: slides.map(s => s.description),
    };
    onSubmit(output);
  };
  
  // Clean up all object URLs on unmount
  useEffect(() => {
    return () => {
      slides.forEach(slide => {
        if (slide.previewUrl) {
          URL.revokeObjectURL(slide.previewUrl);
        }
      });
    };
  }, [slides]);

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg" {...props}>
      {/* 1. List of current slides */}
      <Stack mb="md">
        {slides.length === 0 && <Text c="dimmed" ta="center">Nenhuma etapa adicionada.</Text>}
        {slides.map((slide) => (
          <Paper withBorder p="sm" key={slide.id} radius="sm">
            <Group justify="space-between">
              <Group>
                {slide.previewUrl ? (
                  <Image src={slide.previewUrl} w={60} h={60} alt="preview" radius="sm" />
                ) : (
                  <Box w={60} h={60} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <IconFile size={40} />
                  </Box>
                )}
                <Text size="sm" style={{ maxWidth: '300px' }} truncate>{slide.description}</Text>
              </Group>
              <ActionIcon color="red" onClick={() => handleRemoveStep(slide.id)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
      </Stack>
      
      {/* 2. Form to add a new slide */}
      <Paper withBorder p="md" radius="sm">
        <form onSubmit={form.onSubmit(handleAddStep)}>
          <Stack>
            <Text fw={500}>Adicionar Nova Etapa</Text>
            <FileInput
              label="Imagem da Etapa (Opcional)"
              placeholder="Clique para escolher..."
              {...form.getInputProps('file')}
            />
            <Textarea
              label="Descrição da Etapa"
              placeholder="Ex: Corte as cebolas em cubos..."
              {...form.getInputProps('description')}
              required
            />
            <Button leftSection={<IconPlus size={16} />} type="submit">
              Adicionar Etapa
            </Button>
          </Stack>
        </form>
      </Paper>
      
      {/* 3. Modal Footer */}
      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} loading={isLoading}>
          Salvar Etapas
        </Button>
      </Group>
    </Modal>
  );
}