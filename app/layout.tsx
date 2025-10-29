// PATH: app/layout.tsx
import "@mantine/core/styles.css";
// Ensure globals.css (which now includes font import) is imported AFTER mantine styles
import "./globals.css";

import React from "react";
import { ColorSchemeScript } from "@mantine/core";
import { AppMantineProvider } from "./components/MantineProvider";

export const metadata = {
  title: "Restaurante Espaço XV",
  description: "Sistema de Gestão",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        {/* Google Fonts Preconnect (Optional but Recommended for Performance) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Link to specific font weights loaded in globals.css - not strictly needed if using @import */}
        {/* <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet" /> */}

        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <AppMantineProvider>
          {children}
        </AppMantineProvider>
      </body>
    </html>
  );
}