// File: app/dashboard/components/MainNav.tsx
"use client";

import { NavLink, Stack, Button, Text, Skeleton } from "@mantine/core";
import {
    LayoutDashboard, Users, Martini, Archive, Calculator,
    UserPlus, Briefcase, LineChart, LogOut, Armchair, Music, Disc, Package,
    CookingPot // Changed from ToolsKitchen3
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { ApiResponse, StaffSession } from "@/lib/types";

// Updated navigation links for Acaia
const links = [
    { icon: LayoutDashboard, label: "Visão Geral", href: "/dashboard/live" },
    { icon: Calculator, label: "Nova Comanda (PDV)", href: "/dashboard/pospage" },
    { icon: Users, label: "Clientes", href: "/dashboard/clients" },
    { icon: Armchair, label: "Planta & Mesas", href: "/dashboard/floorplan" },
    { icon: Martini, label: "Produtos & Receitas", href: "/dashboard/products" },
    { icon: Package, label: "Ingredientes", href: "/dashboard/ingredients"},
    { icon: CookingPot, label: "Receitas de Preparo", href: "/dashboard/prep-recipes"},
    { icon: Archive, label: "Estoque", href: "/dashboard/stock" },
    { icon: Music, label: "Artistas & Eventos", href: "/dashboard/entertainers" },
    { icon: Disc, label: "Vinil & DJ Sets", href: "/dashboard/vinyl" },
    { icon: UserPlus, label: "Equipe", href: "/dashboard/staff" },
    // { icon: Briefcase, label: "Parceiros", href: "/dashboard/partners" },
    { icon: LineChart, label: "Relatórios", href: "/dashboard/reports" },
];


// Helper function to fetch session (client-side)
async function getClientSession(): Promise<StaffSession | null> {
    try {
        const res = await fetch('/api/session');
        if (!res.ok) return null;
        const data: ApiResponse<StaffSession> = await res.json();
        return data.success && data.data ? data.data : null;
    } catch (error) {
        console.error("Failed to fetch client session:", error);
        return null;
    }
}


export function MainNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [userName, setUserName] = useState<string | null>(null);
    const [loadingSession, setLoadingSession] = useState(true);

    useEffect(() => {
        getClientSession().then(session => {
            if (session) {
                setUserName(session.name);
            }
            setLoadingSession(false);
        });
    }, []);


    const handleLogout = async () => {
        await fetch("/api/auth", { method: "DELETE" });
        router.push("/");
        router.refresh();
    };


    return (
        <Stack justify="space-between" style={{ height: "100%" }}>
            <Stack>
                {links.map((link) => (
                    <NavLink
                        key={link.label}
                        href={link.href}
                        label={link.label}
                        leftSection={<link.icon size="1rem" />}
                        active={pathname === link.href || (link.href !== '/dashboard/live' && pathname.startsWith(link.href + '/'))}
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                            e.preventDefault();
                            router.push(link.href);
                        }}
                        variant="subtle"
                        styles={(theme) => ({
                            root: {
                              borderRadius: theme.radius.sm,

                              // Styles for the active state (independent of color scheme)
                              '&[data-active]': {
                                backgroundColor: theme.colors.blue[0],
                                color: theme.colors.blue[9],
                                fontWeight: 500,
                                // Target SVG specifically within active link
                                '& svg': {
                                   color: theme.colors.blue[7],
                                },
                              },

                              // Default hover state (will apply in light mode)
                              '&:hover:not([data-active])': {
                                  backgroundColor: theme.colors.gray[1],
                              },

                              // Specific hover state WHEN in dark mode
                              '[data-mantine-color-scheme="dark"] &:hover:not([data-active])': {
                                  backgroundColor: theme.colors.dark[6],
                              },
                            },
                             // REMOVED leftSection: {} as it was causing a syntax error
                        })}
                    />
                ))}
            </Stack>

            <Stack gap="xs">
                 {loadingSession ? (
                    <Skeleton height={15} width="70%" radius="sm" />
                 ) : (
                     <Text size="sm" c="dimmed" truncate>
                         Logado como: {userName || 'Usuário'}
                     </Text>
                 )}
                <Button
                    onClick={handleLogout}
                    variant="light"
                    color="red"
                    leftSection={<LogOut size="1rem" />}
                    fullWidth
                >
                    Sair
                </Button>
            </Stack>
        </Stack>
    );
}