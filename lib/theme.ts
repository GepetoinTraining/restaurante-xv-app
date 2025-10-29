// PATH: lib/theme.ts
"use client";

import { createTheme, MantineColorsTuple, MantineThemeOverride } from '@mantine/core';

// ... (brandGreen and dark color tuples remain the same) ...
const brandGreen: MantineColorsTuple = [
  '#f0f9f4',
  '#e1f0e7',
  '#bfe1cb',
  '#99d2ac',
  '#79c493',
  '#65bc82',
  '#5ab879', // 6: Good for light mode primary action
  '#4aa267',
  '#3f905b', // 8: Good for dark mode primary action
  '#09170e'  // 9: Good for dark mode background
];

export const theme = createTheme({
  fontFamily: 'Montserrat, sans-serif',
  colors: {
    brandGreen,
    dark: [
      '#f0f9f4', // 0: Text color (very light)
      '#99d2ac', // 1
      '#79c493', // 2
      '#5ab879', // 3
      '#4aa267', // 4
      '#3f905b', // 5
      '#1e4b30', // 6: Used for borders, hover backgrounds
      '#143220', // 7: Used for Paper/Card backgrounds in dark mode
      '#0d2115', // 8: Used for subtle hover effects
      '#09170e'  // 9: Used for the main body background in dark mode
    ],
  },
  primaryColor: 'brandGreen',
  primaryShade: {
    light: 6,
    dark: 8,
  },

  // --- ADD THIS SECTION ---
  other: {
    // Override the default body background for light mode
    bodyBackgroundLight: 'var(--mantine-color-gray-0)', // Use the lightest gray
  } as MantineThemeOverride['other'] & { bodyBackgroundLight?: string }, // Type assertion needed for custom property
  // -----------------------

  components: {
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
    },
    Card: {
      defaultProps: {
        shadow: 'sm',
        radius: 'md',
      },
    },
  },
});