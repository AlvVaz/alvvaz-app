import { NextResponse } from "next/server";

import { adminCookieOptions, ADMIN_COOKIE_NAME } from "@/lib/auth/cookies";
import { signAdminToken } from "@/lib/auth/jwt";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD_LENGTH = 8;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    try {
      const existingCount = await prisma.adminUser.count();
      if (existingCount > 0) {
        return NextResponse.json(
          { error: "La cuenta principal ya fue creada." },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("Admin setup count failed:", error);
      return NextResponse.json(
        { error: "No se pudo conectar a la base de datos." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const usernameRaw = formData.get("username");
    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");

    const username =
      typeof usernameRaw === "string" ? usernameRaw.trim().toLowerCase() : "";
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Ingresa usuario, correo y contraseña." },
        { status: 400 }
      );
    }

    if (username.length < 3 || /\s/.test(username)) {
      return NextResponse.json(
        { error: "El usuario debe tener al menos 3 caracteres y sin espacios." },
        { status: 400 }
      );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.` },
        { status: 400 }
      );
    }

    let admin: Awaited<ReturnType<typeof prisma.adminUser.create>> | null = null;
    try {
      const passwordHash = await hashPassword(password);
      admin = await prisma.adminUser.create({
        data: {
          username,
          email,
          passwordHash,
          role: "owner",
          lastLoginAt: new Date(),
          lastPasswordResetAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Admin setup create failed:", error);
      return NextResponse.json(
        { error: "No se pudo crear la cuenta." },
        { status: 500 }
      );
    }

    if (!admin) {
      return NextResponse.json(
        { error: "No se pudo crear la cuenta." },
        { status: 500 }
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
    console.error("Admin setup failed:", error);
    return NextResponse.json(
      { error: "Error interno al crear la cuenta." },
      { status: 500 }
    );
  }
}
