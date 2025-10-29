// PATH: app/components/ui/StandardCarousel.tsx
"use client";

// Don't forget to install the carousel package:
// npm install @mantine/carousel
import { Carousel } from '@mantine/carousel';
import '@mantine/carousel/styles.css'; // Import carousel styles

import { ReactNode } from 'react';
import { Image, Paper, Stack, Text, AspectRatio, Center } from '@mantine/core';

/** The data structure for a single slide */
export interface CarouselSlideData {
  imageSrc?: string; // URL for the image
  description: ReactNode;
}

interface StandardCarouselProps {
  slides: CarouselSlideData[];
  height?: number;
}

/**
 * A standardized carousel for displaying steps,
 * typically for a recipe or guide.
 */
export function StandardCarousel({ slides, height = 400 }: StandardCarouselProps) {
  if (slides.length === 0) {
    return (
      <Paper withBorder p="md" style={{ height: height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text c="dimmed">Sem etapas para exibir no carrossel.</Text>
      </Paper>
    );
  }

  // Map the slide data to carousel components
  const slideComponents = slides.map((slide, index) => (
    <Carousel.Slide key={index}>
      <Stack h="100%" justify="space-between">
        {slide.imageSrc ? (
          <AspectRatio ratio={16 / 9}>
            <Image src={slide.imageSrc} alt={`Etapa ${index + 1}`} />
          </AspectRatio>
        ) : (
          <Center h="100%" bg="var(--mantine-color-gray-1)">
            <Text c="dimmed">Sem imagem</Text>
          </Center>
        )}
        <Text p="md" ta="center">{slide.description}</Text>
      </Stack>
    </Carousel.Slide>
  ));

  return (
    <Paper withBorder radius="md" p="md">
      <Carousel
        withIndicators
        height={height}
        slideSize="100%"
        slideGap="md"
      >
        {slideComponents}
      </Carousel>
    </Paper>
  );
}