// PATH: lib/themes.ts
"use client";

import { createTheme, MantineThemeOverride } from '@mantine/core';

/**
 * This is the base theme for everyone.
 * We set autoContrast: true here as you suggested.
 */
export const baseTheme = createTheme({
  primaryColor: 'blue',
  autoContrast: true,
  // Add other baseline overrides here (fonts, primaryShade, etc.)
});

/**
 * Profile 1: Compact (Young Person)
 * Tighter, smaller, more data-dense.
 */
export const compactTheme: MantineThemeOverride = {
  scale: 0.9,
  fontSizes: {
    xs: '0.6rem',
    sm: '0.7rem',
    md: '0.8rem',
    lg: '0.9rem',
    xl: '1.0rem',
  },
  spacing: {
    xs: '0.4rem',
    sm: '0.6rem',
    md: '0.8rem',
    lg: '1.0rem',
    xl: '1.2rem',
  },
  radius: {
    xs: '0.1rem',
    sm: '0.2rem',
    md: '0.3rem',
    lg: '0.4rem',
    xl: '0.5rem',
  },
};

/**
 * Profile 2: Comfortable (Adult / Default)
 * This can be an empty object to use Mantine's defaults,
 * or have minor tweaks.
 */
export const comfortableTheme: MantineThemeOverride = {
  // We can leave this empty to use Mantine defaults
  // or use the 'baseTheme' as the comfortable one.
};

/**
 * Profile 3: Accessible (Older Person)
 * Larger, more spaced out, easier to click.
 */
export const accessibleTheme: MantineThemeOverride = {
  scale: 1.1, // This scales everything up!
  focusRing: 'always', // Always show focus rings for accessibility
  fontSizes: {
    xs: '0.85rem',
    sm: '0.95rem',
    md: '1.05rem',
    lg: '1.2rem',
    xl: '1.4rem',
  },
  spacing: {
    xs: '0.6rem',
    sm: '0.9rem',
    md: '1.2rem',
    lg: '1.5rem',
    xl: '2.0rem',
  },
  radius: {
    xs: '0.2rem',
    sm: '0.4rem',
    md: '0.6rem',
    lg: '0.8rem',
    xl: '1.0rem',
  },
};