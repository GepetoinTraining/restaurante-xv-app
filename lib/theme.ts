// PATH: lib/theme.ts
"use client";

import { createTheme, MantineColorsTuple } from '@mantine/core';

// The color you provided
const myColor: MantineColorsTuple = [
  '#e1ffed',
  '#cbffdd',
  '#99ffbb',
  '#62ff97',
  '#33ff77',
  '#18ff65',
  '#00ff5a',
  '#00e349',
  '#00ca3f',
  '#00af31'
];

export const theme = createTheme({
  colors: {
    // Register your color
    myColor, 
  },
  // Set it as the default "brand" color
  primaryColor: 'myColor',
  primaryShade: 7, // A good default shade
  
  // You can add other global theme overrides here
  // e.g., components: { ... }
});