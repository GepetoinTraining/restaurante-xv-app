// PATH: lib/theme.ts
'use client';

import { createTheme, MantineColorsTuple, MantineTheme } from '@mantine/core'; // ---- START FIX: Import MantineTheme ----

// Define custom color tuple (e.g., a warm orange)
const xvOrange: MantineColorsTuple = [
  "#fff4e2", // Lightest shade
  "#ffe9cc",
  "#ffcea0",
  "#ffb170",
  "#ffa04d", // Primary shade (index 4 or 5 typically)
  "#ff9536",
  "#ff912b", // Darker shade for hover/active
  "#e67c1c",
  "#ce6c11",
  "#b75c0c"  // Darkest shade
];

export const theme = createTheme({
  /** Put your mantine theme override here */
  // Example: Setting primary color
  primaryColor: 'xv-orange', // Use the custom color name
  colors: {
    'xv-orange': xvOrange, // Register the custom color
  },

  // Example: Setting default font family
  fontFamily: 'Verdana, sans-serif', // A simple, widely available font

  // Example: Setting default border radius
  radius: {
    xs: '2px',
    sm: '4px', // Slightly rounded corners
    md: '8px',
    lg: '16px',
    xl: '32px',
  },
  defaultRadius: 'sm', // Use the 'sm' radius by default for most components

  // Example: Overriding specific component styles globally
  components: {
    Button: {
      defaultProps: {
        // Example: Default variant or size for all buttons
        // variant: 'light',
        radius: "sm", // Buttons on the site seem to have slight rounding
      },
      // ---- START FIX: Add type to theme parameter ----
      styles: (theme: MantineTheme) => ({
      // ---- END FIX ----
           root: {
               // Example: Make default buttons use the primary orange
               // This ensures buttons match the brand unless overridden
               // '&[data-variant="filled"]': {
               //     backgroundColor: theme.colors['xv-orange'][5],
               //     '&:hover': {
               //         backgroundColor: theme.colors['xv-orange'][6],
               //     },
               // },
           },
       }),
    },
    // Add overrides for other components like Input, Modal, etc. if needed
    // Input: {
    //   styles: (theme) => ({
    //     input: {
    //       borderColor: theme.colors.gray[4],
    //     },
    //   }),
    // },
    // Modal: {
    //     styles: {
    //         header: { backgroundColor: theme.colors.gray[1] },
    //     }
    // }
  },
});