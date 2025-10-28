// File: app/layout.tsx
import "@mantine/core/styles.css";
import "./globals.css";

import React from "react";
import { ColorSchemeScript } from "@mantine/core";
import { MantineProvider } from "./components/MantineProvider";
import { Notifications } from "@mantine/notifications"; // Import Notifications

export const metadata = {
  // title: "Acaia - Dashboard", // Changed title for Acaia
  title: "Acaia",
  description: "Acaia Menu & Dashboard", // Updated description
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        {/* Keep defaultColorScheme="dark" if that's the desired default */}
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="shortcut icon" href="/favicon.ico" /> {/* You might want an Acaia favicon */}
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider>
          {/* Add Notifications component here */}
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}