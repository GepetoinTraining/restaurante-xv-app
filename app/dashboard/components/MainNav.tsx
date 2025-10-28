// PATH: app/dashboard/components/MainNav.tsx
"use client";

import { NavLink, Stack, Button, Text, Skeleton } from "@mantine/core";
import {
    LayoutDashboard, Users, Martini, Archive, Calculator,
    UserPlus, Briefcase, LineChart, LogOut, Armchair, Music, Disc, Package,
    CookingPot, ClipboardCheck, ClipboardList, // New icons for tasks/management
    Receipt, Scale, Trash2 // New icons for invoices, weigh, waste
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { ApiResponse, StaffSession } from "@/lib/types";

// Updated navigation links including catering workflow placeholders
const links = [
    // Core Links
    { icon: LayoutDashboard, label: "Visão Geral", href: "/dashboard/live" },
    { icon: Calculator, label: "Nova Comanda (PDV)", href: "/dashboard/pospage" },
    { icon: Users, label: "Clientes", href: "/dashboard/clients" },
    { icon: Armchair, label: "Planta & Mesas", href: "/dashboard/floorplan" },

    // Inventory & Production
    { icon: Martini, label: "Produtos & Receitas", href: "/dashboard/products" },
    { icon: Package, label: "Ingredientes", href: "/dashboard/ingredients"},
    { icon: CookingPot, label: "Receitas de Preparo", href: "/dashboard/prep-recipes"},
    { icon: Archive, label: "Estoque Detalhado", href: "/dashboard/stock" }, // Renamed slightly

    // Catering Workflow Links (Placeholders initially)
    { icon: ClipboardCheck, label: "Minhas Tarefas", href: "/dashboard/my-tasks" },
    { icon: ClipboardList, label: "Gerenciar Preparos", href: "/dashboard/prep-management" },
    { icon: Receipt, label: "Entrada (Invoices)", href: "/dashboard/invoices" },
    { icon: Scale, label: "Buffet & Pesagem", href: "/dashboard/weigh-station" }, // Combined for now
    { icon: Trash2, label: "Registro de Perdas", href: "/dashboard/waste" },

    // Entertainment
    { icon: Music, label: "Artistas & Eventos", href: "/dashboard/entertainers" },
    { icon: Disc, label: "Vinil & DJ Sets", href: "/dashboard/vinyl" },

    // Admin & Reporting
    { icon: UserPlus, label: "Equipe", href: "/dashboard/staff" },
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
            <ScrollArea type="auto" style={{ flexGrow: 1, paddingRight: 'var(--mantine-spacing-md)' /* Prevent scrollbar overlap */ }}>
                <Stack>
                    {links.map((link) => (
                        <NavLink
                            key={link.label}
                            href={link.href}
                            label={link.label}
                            leftSection={<link.icon size="1rem" />}
                            // Improved active state logic: exact match for '/', startsWith for others
                            active={pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href + '/'))}
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
                                    backgroundColor: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).background,
                                    color: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).color,
                                    fontWeight: 500,
                                    // Target SVG specifically within active link
                                    '& svg': {
                                       color: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).color,
                                    },
                                  },
                                  // Default hover state
                                  '&:hover:not([data-active])': {
                                      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[1],
                                  },
                                },
                                // leftSection: {}, // Removed if not needed
                            })}
                        />
                    ))}
                </Stack>
            </ScrollArea>

            <Stack gap="xs" pt="md" style={{ borderTop: `1px solid var(--mantine-color-default-border)`}}>
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
// Need to import ScrollArea
import { ScrollArea } from "@mantine/core";