// File: lib/theme.ts
"use client";

import { createTheme, MantineColorsTuple } from "@mantine/core";

// Define a Pastel Green
const pastelGreen: MantineColorsTuple = [
  "#e6fcf5", // Lightest 0
  "#d5f9ec", // 1
  "#aef2d8", // 2
  "#85ebc2", // 3
  "#62e4ae", // 4 Main shade?
  "#4add9f", // 5
  "#3cc997", // 6 Darker shade?
  "#30b184", // 7
  "#249c73", // 8
  "#138663"  // Darkest 9
];

// CORRECTED: Only one theme definition using pastelGreen
export const theme = createTheme({
  primaryColor: "pastelGreen", // Use the pastel green
  colors: {
    pastelGreen, // Add the new color tuple
  },
  fontFamily: "Inter, sans-serif", // Keep original font settings
  headings: {
    fontFamily: "Inter, sans-serif",
    fontWeight: "600",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
      },
    },
    // Add other component overrides if needed
  },
  // You might want to explicitly set defaultColorScheme here or in MantineProvider
  // defaultColorScheme: 'light', // Pastels often work better on light backgrounds
});

