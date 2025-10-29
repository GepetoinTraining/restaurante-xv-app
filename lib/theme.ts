// PATH: lib/theme.ts
"use client";

import { createTheme, MantineColorsTuple } from '@mantine/core';

// The new greenish-gray color tuple you provided
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
  // Use the font you're loading in globals.css
  fontFamily: 'Montserrat, sans-serif',
  
  colors: {
    // 1. Register your new color
    brandGreen,

    // 2. Override the default 'dark' color palette
    // This achieves your "greenish gray for the base dark mode"
    // App backgrounds, papers, and cards will now use these shades in dark mode
    dark: [
      '#f0f9f4',
      '#99d2ac',
      '#79c493',
      '#5ab879',
      '#4aa267',
      '#3f905b',
      '#1e4b30', // A new intermediate dark shade
      '#143220', // Used for Paper/Card backgrounds in dark mode
      '#0d2115', // Used for hover effects
      '#09170e'  // Used for the main body background in dark mode
    ],
  },
  
  // 3. Set your new color as the primary "brand" color
  primaryColor: 'brandGreen',

  // 4. Set different default shades for light and dark modes
  // This will make buttons and links look good in both modes automatically
  primaryShade: {
    light: 6,
    dark: 8,
  },

  // 5. Add some global component overrides for consistency
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