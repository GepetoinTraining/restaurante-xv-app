// PATH: lib/theme.ts
"use client";

import { createTheme, MantineColorsTuple } from "@mantine/core";

// Define an Orange color tuple (adjust shades as needed)
const brandOrange: MantineColorsTuple = [
  "#fff4e6", // Lightest
  "#ffe8cc",
  "#ffd099",
  "#ffb766", // Lighter mid-tone
  "#ffa136", // Main orange shade (adjust index in primaryColor if needed)
  "#ff961a",
  "#ff910c", // Darker mid-tone
  "#e37d00", // Darker
  "#c96e00",
  "#ae5e00", // Darkest
];

// Define Pastel Green (keeping the previous one available)
const pastelGreen: MantineColorsTuple = [
  "#e6fcf5", "#d5f9ec", "#aef2d8", "#85ebc2", "#62e4ae",
  "#4add9f", "#3cc997", "#30b184", "#249c73", "#138663"
];

// Define Gold color tuple (keeping the previous one available)
const privacyGold: MantineColorsTuple = [
  "#fff9e0", "#fff2cc", "#ffe59e", "#ffd76b", "#ffcb3f",
  "#ffc323", "#ffbe10", "#e3a502", "#c99100", "#ae7d00"
];


export const theme = createTheme({
  /* Define primary color */
  primaryColor: "brandOrange", // Use the orange color
  colors: {
    brandOrange, // Add the orange tuple
    pastelGreen, // Keep pastelGreen available
    privacyGold, // Keep gold available
  },
  /* Customize other theme properties */
  // Use a font that matches the site's modern sans-serif style
  // Ensure you import 'Montserrat' via a CSS import or font provider if using it
  fontFamily: "'Montserrat', sans-serif",
  headings: {
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: "700", // Headings on the site appear bold
  },
  components: {
    Button: {
      defaultProps: {
        radius: "sm", // Buttons on the site seem to have slight rounding
      },
       styles: (theme) => ({
           root: {
               // Example: Make default buttons use the primary orange
               // This ensures buttons match the brand unless overridden
               // Adjust shades as needed for visual appeal
               // backgroundColor: theme.colors.brandOrange[6],
               // color: theme.white,
               // '&:hover': {
               //    backgroundColor: theme.colors.brandOrange[7],
               // }
           }
       })
    },
    Paper: {
      defaultProps: {
        radius: "md",
        shadow: "sm",
      },
    },
     NavLink: { // Style NavLinks for better contrast/fit with dark theme & orange accent
        styles: (theme) => ({
             root: {
                borderRadius: theme.radius.sm,
                '&[data-active]': {
                    // Use a darker shade of orange for active background in dark mode
                    backgroundColor: theme.colors.brandOrange[8],
                    color: theme.white, // Ensure text is readable
                    fontWeight: 500,
                    '& svg': {
                       color: theme.white,
                    },
                     '&:hover': {
                         backgroundColor: theme.colors.brandOrange[9], // Slightly darker on hover
                     }
                 },
                 '&:hover:not([data-active])': {
                    backgroundColor: theme.colors.dark[6], // Standard dark hover
                 },
           },
        }),
     },
    // Add other component overrides if needed
  },
  // Keep dark as the default based on MantineProvider setting
  defaultColorScheme: 'dark',
});