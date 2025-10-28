// File: app/api/entertainers/[id]/route.ts
import { prisma } from "@/lib/prisma"; ///route.ts]
import { getSession } from "@/lib/auth"; ///route.ts]
import { ApiResponse } from "@/lib/types"; ///route.ts]
import { NextRequest, NextResponse } from "next/server"; ///route.ts]
import { Entertainer, Prisma, Role, EntertainerType } from "@prisma/client"; // Added EntertainerType ///route.ts]

type RouteParams = { ///route.ts]
    params: { id: string }; ///route.ts]
}; ///route.ts]

/**
 * PATCH /api/entertainers/[id]
 * Updates an existing entertainer.
 * Requires OWNER/MANAGER role.
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) { ///route.ts]
    const session = await getSession(); ///route.ts]
    // Use the correct session property 'user' and Role enum
    if (!session.user?.isLoggedIn || (session.user.role !== Role.OWNER && session.user.role !== Role.MANAGER)) { ///route.ts]
        return NextResponse.json<ApiResponse>( ///route.ts]
            { success: false, error: "Não autorizado (Owner/Manager required)" }, ///route.ts]
            { status: 403 } ///route.ts]
        ); ///route.ts]
    } ///route.ts]

    const id = params.id; ///route.ts]

    let updateData: Prisma.EntertainerUpdateInput = {}; ///route.ts]

    try { ///route.ts]
        // Define body type based on Entertainer schema fields
        const body = await req.json() as { ///route.ts]
            name?: string; ///route.ts]
            type?: EntertainerType; ///route.ts]
            bio?: string | null; // Correct field name ///route.ts]
            imageUrl?: string | null; ///route.ts]
            rate?: number | string | null; ///route.ts]
            // isActive is not in schema
        }; ///route.ts]

        // Destructure correct fields
        const { name, type, bio, imageUrl, rate } = body; ///route.ts]

        let inputError: string | null = null; ///route.ts]

        if (name !== undefined) { ///route.ts]
            if (name.trim().length < 1) inputError = "Nome não pode ser vazio."; ///route.ts]
            else updateData.name = name.trim(); ///route.ts]
        } ///route.ts]
        if (type !== undefined) { ///route.ts]
            // Validate against the imported EntertainerType enum
            if (!Object.values(EntertainerType).includes(type as EntertainerType)) { // Cast type ///route.ts]
                inputError = "Tipo de artista inválido."; ///route.ts]
            } else { ///route.ts]
                updateData.type = type as EntertainerType; // Cast type again during assignment ///route.ts]
            } ///route.ts]
        } ///route.ts]
        // --- FIX: Use 'bio' instead of 'contactNotes' ---
        if (bio !== undefined) { ///route.ts]
             updateData.bio = bio || null; ///route.ts]
        } ///route.ts]
        // --- End Fix ---
         if (imageUrl !== undefined) { ///route.ts]
             updateData.imageUrl = imageUrl || null; ///route.ts]
         } ///route.ts]
         if (rate !== undefined) { ///route.ts]
             try { ///route.ts]
                 updateData.rate = rate === null || rate === '' ? null : new Prisma.Decimal(rate.toString()); ///route.ts]
             } catch { ///route.ts]
                 inputError = "Formato de cachê inválido."; ///route.ts]
             } ///route.ts]
         } ///route.ts]
        // Removed isActive logic as it's not in the Entertainer schema

        if (inputError) { ///route.ts]
             return NextResponse.json<ApiResponse>({ success: false, error: inputError }, { status: 400 }); ///route.ts]
        } ///route.ts]
        if (Object.keys(updateData).length === 0) { ///route.ts]
            return NextResponse.json<ApiResponse>({ success: false, error: "Nenhum dado fornecido para atualização." }, { status: 400 }); ///route.ts]
        } ///route.ts]

        const updatedEntertainer = await prisma.entertainer.update({ ///route.ts]
            where: { id }, ///route.ts]
            data: updateData, ///route.ts]
        }); ///route.ts]

        const serializedEntertainer = { ///route.ts]
            ...updatedEntertainer, ///route.ts]
            rate: updatedEntertainer.rate ? updatedEntertainer.rate.toString() : null, ///route.ts]
        }; ///route.ts]

        return NextResponse.json<ApiResponse<any>>( ///route.ts]
            { success: true, data: serializedEntertainer }, ///route.ts]
            { status: 200 } ///route.ts]
        ); ///route.ts]

    } catch (error: any) { ///route.ts]
        console.error(`PATCH /api/entertainers/${id} error:`, error); ///route.ts]
        if (error instanceof Prisma.PrismaClientKnownRequestError) { ///route.ts]
            if (error.code === 'P2002') { ///route.ts]
                const target = error.meta?.target as string[]; ///route.ts]
                const isNameError = Array.isArray(target) && target.includes('name'); ///route.ts]

                if (isNameError && updateData.name !== undefined) { ///route.ts]
                     return NextResponse.json<ApiResponse>({ success: false, error: "Já existe um artista com este nome." }, { status: 409 }); ///route.ts]
                } ///route.ts]
            } ///route.ts]
            if (error.code === 'P2025') { ///route.ts]
                 return NextResponse.json<ApiResponse>({ success: false, error: "Artista não encontrado." }, { status: 404 }); ///route.ts]
            } ///route.ts]
        } ///route.ts]
        return NextResponse.json<ApiResponse>({ success: false, error: "Erro ao atualizar artista." }, { status: 500 }); ///route.ts]
    } ///route.ts]
} ///route.ts]

/**
 * DELETE /api/entertainers/[id]
 * Deletes an entertainer.
 * Requires OWNER/MANAGER role.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) { ///route.ts]
    const session = await getSession(); ///route.ts]
     if (!session.user?.isLoggedIn || (session.user.role !== Role.OWNER && session.user.role !== Role.MANAGER)) { ///route.ts]
        return NextResponse.json<ApiResponse>( ///route.ts]
            { success: false, error: "Não autorizado (Owner/Manager required)" }, ///route.ts]
            { status: 403 } ///route.ts]
        ); ///route.ts]
    } ///route.ts]

    const id = params.id; ///route.ts]

    try { ///route.ts]
        const deletedEntertainer = await prisma.entertainer.delete({ ///route.ts]
            where: { id }, ///route.ts]
        }); ///route.ts]

        return NextResponse.json<ApiResponse>( ///route.ts]
            { success: true, data: { message: `Artista "${deletedEntertainer.name}" excluído.` } }, ///route.ts]
            { status: 200 } ///route.ts]
        ); ///route.ts]

    } catch (error: any) { ///route.ts]
        console.error(`DELETE /api/entertainers/${id} error:`, error); ///route.ts]
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { ///route.ts]
             return NextResponse.json<ApiResponse>({ success: false, error: "Artista não encontrado." }, { status: 404 }); ///route.ts]
         } ///route.ts]
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') { ///route.ts]
              return NextResponse.json<ApiResponse>({ success: false, error: "Não é possível excluir. Artista está associado a eventos agendados." }, { status: 409 }); ///route.ts]
         } ///route.ts]
        return NextResponse.json<ApiResponse>({ success: false, error: "Erro ao excluir artista." }, { status: 500 }); ///route.ts]
    } ///route.ts]
} ///route.ts]