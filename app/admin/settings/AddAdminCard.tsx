"use client";

import { useEffect, useMemo, useState } from "react";

type AddAdminCardProps = {
  isOwner: boolean;
  action: (formData: FormData) => void | Promise<void>;
};

export function AddAdminCard({ isOwner, action }: AddAdminCardProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const identifier = username || email;
  const inviteLink = useMemo(() => {
    if (!origin || !identifier) return "";
    return `${origin}/admin/login?identifier=${encodeURIComponent(identifier)}`;
  }, [identifier, origin]);

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <details className="group">
        <summary className="cursor-pointer list-none px-6 py-4 [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Agregar admin</h2>
              <p className="mt-1 text-sm text-slate-600">
                Crea accesos para tu equipo.
              </p>
            </div>
            <span className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
              Gestionar
            </span>
          </div>
        </summary>
        <div className="border-t border-slate-200 px-6 py-5">
          <form action={action} className="space-y-4">
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Usuario
              <input
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={!isOwner}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Correo
              <input
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!isOwner}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Contraseña
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                disabled={!isOwner}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Rol
              <select
                name="role"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={!isOwner}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="admin">Admin</option>
                <option value="tech">Tech</option>
                <option value="owner">Owner</option>
              </select>
            </label>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Link de invitación
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Preselecciona el usuario/correo en el login.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={inviteLink || "Completa usuario o correo"}
                  readOnly
                  className="min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!inviteLink}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isOwner}
              className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar Admin
            </button>
            {!isOwner ? (
              <p className="text-xs text-slate-500">
                Solo el owner puede agregar admins.
              </p>
            ) : null}
          </form>
        </div>
      </details>
    </section>
  );
}
