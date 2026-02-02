import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getAdminFromCookies } from "@/lib/auth/admin";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import { AddAdminCard } from "./AddAdminCard";

type SettingsPageProps = {
  searchParams?: {
    notice?: string;
    error?: string;
  };
};

const NOTICE_COPY: Record<string, string> = {
  admin_created: "Usuario creado.",
  profile_updated: "Perfil actualizado.",
  role_updated: "Rol actualizado.",
  user_deleted: "Usuario eliminado.",
};

const ERROR_COPY: Record<string, string> = {
  not_owner: "Solo owner o tech pueden agregar usuarios.",
  invalid_data: "Datos incompletos.",
  invalid_role: "Rol inválido.",
  username_taken: "El usuario ya existe.",
  email_taken: "El correo ya existe.",
  update_failed: "No se pudo actualizar el perfil.",
  create_failed: "No se pudo crear el admin.",
  role_update_failed: "No se pudo actualizar el rol.",
  role_not_allowed: "No tienes permisos para cambiar este rol.",
  role_self_blocked: "No puedes cambiar tu propio rol.",
  role_owner_blocked: "Solo el owner puede cambiar roles de owners.",
  delete_not_allowed: "No tienes permisos para eliminar este usuario.",
  delete_self_blocked: "No puedes eliminar tu propio usuario.",
  delete_failed: "No se pudo eliminar el usuario.",
};

function buildSettingsUrl(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `/admin/settings?${query}` : "/admin/settings";
}

async function ensureAdmin() {
  const admin = await getAdminFromCookies();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

export default async function AdminSettingsPage({
  searchParams,
}: SettingsPageProps) {
  const admin = await ensureAdmin();
  const adminRecord = await prisma.adminUser.findUnique({
    where: { id: admin.sub },
  });
  const adminUsers = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
  });
  const adminCount = await prisma.adminUser.count();
  const noticeKey = searchParams?.notice ?? "";
  const notice = noticeKey ? NOTICE_COPY[noticeKey] : "";
  const error = searchParams?.error ? ERROR_COPY[searchParams.error] : "";
  const isOwner = admin.role === "owner";
  const isTech = admin.role === "tech";
  const showAudit = isOwner;

  const formatAuditDate = (value: Date | null) =>
    value
      ? new Date(value).toLocaleString("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "—";

  async function createAdmin(formData: FormData) {
    "use server";
    const current = await ensureAdmin();
    if (current.role !== "owner" && current.role !== "tech") {
      redirect(buildSettingsUrl({ error: "not_owner" }));
    }

    const usernameRaw = formData.get("username");
    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");
    const roleRaw = formData.get("role");

    const username =
      typeof usernameRaw === "string" ? usernameRaw.trim().toLowerCase() : "";
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";
    const role =
      roleRaw === "owner" || roleRaw === "admin" || roleRaw === "tech"
        ? roleRaw
        : "admin";

    if (!username || !email || !password) {
      redirect(buildSettingsUrl({ error: "invalid_data" }));
    }

    if (role === "owner" && current.role !== "owner") {
      redirect(buildSettingsUrl({ error: "role_owner_blocked" }));
    }

    try {
      const existing = await prisma.adminUser.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existing?.email === email) {
        redirect(buildSettingsUrl({ error: "email_taken" }));
      }
      if (existing?.username === username) {
        redirect(buildSettingsUrl({ error: "username_taken" }));
      }

      const passwordHash = await hashPassword(password);
      await prisma.adminUser.create({
        data: {
          username,
          email,
          passwordHash,
          role,
          lastPasswordResetAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Create admin failed:", error);
      redirect(buildSettingsUrl({ error: "create_failed" }));
    }

    revalidatePath("/admin/settings");
    redirect(buildSettingsUrl({ notice: "admin_created" }));
  }

  async function updateProfile(formData: FormData) {
    "use server";
    const current = await ensureAdmin();
    const usernameRaw = formData.get("username");
    const emailRaw = formData.get("email");
    const passwordRaw = formData.get("password");

    const username =
      typeof usernameRaw === "string" ? usernameRaw.trim().toLowerCase() : "";
    const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
    const password = typeof passwordRaw === "string" ? passwordRaw : "";

    const data: {
      username?: string;
      email?: string;
      passwordHash?: string;
      lastPasswordResetAt?: Date;
    } = {};

    if (username) {
      data.username = username;
    }
    if (email) {
      data.email = email;
    }

    if (password) {
      data.passwordHash = await hashPassword(password);
      data.lastPasswordResetAt = new Date();
    }

    if (Object.keys(data).length === 0) {
      redirect(buildSettingsUrl({ error: "invalid_data" }));
    }

    try {
      await prisma.adminUser.update({
        where: { id: current.sub },
        data,
      });
    } catch (error) {
      console.error("Update profile failed:", error);
      redirect(buildSettingsUrl({ error: "update_failed" }));
    }

    revalidatePath("/admin/settings");
    redirect(buildSettingsUrl({ notice: "profile_updated" }));
  }

  async function updateRole(formData: FormData) {
    "use server";
    const current = await ensureAdmin();
    if (current.role !== "owner" && current.role !== "tech") {
      redirect(buildSettingsUrl({ error: "role_not_allowed" }));
    }

    const userIdRaw = formData.get("userId");
    const roleRaw = formData.get("role");
    const userId = typeof userIdRaw === "string" ? userIdRaw : "";
    const role =
      roleRaw === "owner" || roleRaw === "admin" || roleRaw === "tech"
        ? roleRaw
        : null;

    if (!userId || !role) {
      redirect(buildSettingsUrl({ error: "invalid_role" }));
    }

    if (current.sub === userId) {
      redirect(buildSettingsUrl({ error: "role_self_blocked" }));
    }

    const target = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!target) {
      redirect(buildSettingsUrl({ error: "role_update_failed" }));
    }

    if (target.role === "owner" && current.role !== "owner") {
      redirect(buildSettingsUrl({ error: "role_owner_blocked" }));
    }

    if (role === "owner" && current.role !== "owner") {
      redirect(buildSettingsUrl({ error: "role_owner_blocked" }));
    }

    try {
      await prisma.adminUser.update({
        where: { id: userId },
        data: { role },
      });
    } catch (error) {
      console.error("Update role failed:", error);
      redirect(buildSettingsUrl({ error: "role_update_failed" }));
    }

    revalidatePath("/admin/settings");
    redirect(buildSettingsUrl({ notice: "role_updated" }));
  }

  async function deleteUser(formData: FormData) {
    "use server";
    const current = await ensureAdmin();
    if (current.role !== "owner" && current.role !== "tech") {
      redirect(buildSettingsUrl({ error: "delete_not_allowed" }));
    }

    const userIdRaw = formData.get("userId");
    const userId = typeof userIdRaw === "string" ? userIdRaw : "";

    if (!userId) {
      redirect(buildSettingsUrl({ error: "delete_failed" }));
    }

    if (current.sub === userId) {
      redirect(buildSettingsUrl({ error: "delete_self_blocked" }));
    }

    const target = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!target) {
      redirect(buildSettingsUrl({ error: "delete_failed" }));
    }

    if (target.role === "owner" && current.role !== "owner") {
      redirect(buildSettingsUrl({ error: "delete_not_allowed" }));
    }

    try {
      await prisma.adminUser.delete({ where: { id: userId } });
    } catch (error) {
      console.error("Delete user failed:", error);
      redirect(buildSettingsUrl({ error: "delete_failed" }));
    }

    revalidatePath("/admin/settings");
    redirect(buildSettingsUrl({ notice: "user_deleted" }));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="mt-2 text-sm text-slate-600">
          Administra tu cuenta y los accesos del panel.
        </p>
        {notice ? (
          <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mi perfil</h2>
          <p className="mt-1 text-sm text-slate-600">
            Actualiza tu usuario, correo o contraseña.
          </p>
          <form action={updateProfile} className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Usuario
              <input
                name="username"
                type="text"
                defaultValue={adminRecord?.username ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Correo
              <input
                name="email"
                type="email"
                defaultValue={adminRecord?.email ?? ""}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Nueva contraseña
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Dejar vacío para no cambiar"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
              />
            </label>
            <button
              type="submit"
              className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700"
            >
              Editar mi perfil
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              Usuarios del panel
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Lista de accesos actuales.
            </p>
            <div className="mt-4 space-y-3">
              {adminUsers.map((user) => {
                const isSelf = user.id === admin.sub;
                const canEditRole =
                  (isOwner || isTech) &&
                  !isSelf &&
                  (isOwner || user.role !== "owner");

                return (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-2"
                  >
                    <div className="min-w-[180px]">
                      <p className="text-sm font-semibold text-slate-900">
                        {user.username || "Sin usuario"}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {(showAudit || isOwner || isTech) ? (
                        <details className="mt-2 text-xs text-slate-500">
                          <summary className="cursor-pointer font-semibold text-slate-500">
                            Ver detalles
                          </summary>
                          <div className="mt-2 space-y-1">
                            <p>Creado: {formatAuditDate(user.createdAt)}</p>
                            <p>Actualizado: {formatAuditDate(user.updatedAt)}</p>
                            {showAudit ? (
                              <>
                                <p>
                                  Último acceso:{" "}
                                  {formatAuditDate(user.lastLoginAt)}
                                </p>
                                <p>
                                  Último cambio de contraseña:{" "}
                                  {formatAuditDate(user.lastPasswordResetAt)}
                                </p>
                              </>
                            ) : null}
                          </div>
                        </details>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={updateRole} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          disabled={!canEditRole}
                          className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        >
                          <option value="owner">Owner</option>
                          <option value="admin">Admin</option>
                          <option value="tech">Tech</option>
                        </select>
                        <button
                          type="submit"
                          disabled={!canEditRole}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Guardar
                        </button>
                      </form>
                      <form action={deleteUser}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button
                          type="submit"
                          disabled={!canEditRole}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                    {!canEditRole ? (
                      <span className="w-full text-[11px] text-slate-400">
                        Solo owner o tech pueden eliminar.
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {adminUsers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay usuarios registrados.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Número de usuarios
            </p>
            <p className="mt-2 text-3xl font-semibold text-brand-950">
              {adminCount}
            </p>
          </div>

          <AddAdminCard
            canAddUsers={isOwner || isTech}
            action={createAdmin}
            didCreateAdmin={noticeKey === "admin_created"}
            noticeMessage={noticeKey === "admin_created" ? notice : ""}
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Cerrar sesión</h2>
            <p className="mt-1 text-sm text-slate-600">
              Sal de tu cuenta en este dispositivo.
            </p>
            <form action="/api/auth/logout" method="post" className="mt-4">
              <button
                type="submit"
                className="inline-flex rounded-full border border-slate-200 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cerrar Sesión
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
