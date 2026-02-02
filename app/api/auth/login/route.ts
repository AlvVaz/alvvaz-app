import { NextResponse } from "next/server";

import { adminCookieOptions, ADMIN_COOKIE_NAME } from "@/lib/auth/cookies";
import { signAdminToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const identifierRaw = formData.get("identifier") ?? formData.get("email");
    const passwordRaw = formData.get("password");

    const identifier =
      typeof identifierRaw === "string" ? identifierRaw.trim().toLowerCase() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Ingresa usuario o correo y contraseña." },
        { status: 400 }
      );
    }

    let admin: Awaited<ReturnType<typeof prisma.adminUser.findFirst>> | null =
      null;
    try {
      admin = identifier.includes("@")
        ? await prisma.adminUser.findUnique({ where: { email: identifier } })
        : await prisma.adminUser.findFirst({
            where: {
              OR: [{ email: identifier }, { username: identifier }],
            },
          });
    } catch (error) {
      console.error("Admin login lookup failed:", error);
      return NextResponse.json(
        { error: "No se pudo conectar a la base de datos." },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: "Credenciales inválidas." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales inválidas." },
        { status: 401 }
      );
    }

    const token = await signAdminToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    const response = NextResponse.json({ ok: true, role: admin.role });
    response.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Admin login failed:", error);
    return NextResponse.json(
      { error: "Error interno de inicio de sesión." },
      { status: 500 }
    );
  }
}
