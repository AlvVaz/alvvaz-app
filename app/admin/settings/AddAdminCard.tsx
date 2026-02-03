"use client";

import { useEffect, useMemo, useState } from "react";

import { ThemedSelect } from "@/components/ui/themed-select";
type AddAdminCardProps = {
  canAddUsers: boolean;
  action: (formData: FormData) => void | Promise<void>;
  didCreateAdmin?: boolean;
  noticeMessage?: string;
};

export function AddAdminCard({
  canAddUsers,
  action,
  didCreateAdmin = false,
  noticeMessage = "",
}: AddAdminCardProps) {
  const [isOpen, setIsOpen] = useState(didCreateAdmin);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("admin");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (didCreateAdmin) {
      setIsOpen(true);
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("admin");
    }
  }, [didCreateAdmin]);

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
      <details
        className="group"
        open={isOpen}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
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
          {noticeMessage ? (
            <p className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {noticeMessage}
            </p>
          ) : null}
          <form action={action} className="space-y-4">
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Usuario
              <input
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={!canAddUsers}
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
                disabled={!canAddUsers}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Contraseña
              <span className="relative block">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={!canAddUsers}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={!canAddUsers}
                  className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-500 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:text-slate-400"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M3 3l18 18" strokeLinecap="round" strokeLinejoin="round" />
                      <path
                        d="M10.5 10.7a2.5 2.5 0 0 0 3.3 3.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.7 6.7C4.4 8.2 2.9 10.4 2 12c2.2 3.6 6.1 6 10 6 1.9 0 3.7-.5 5.3-1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.9 4.3C10.6 4.1 11.3 4 12 4c3.9 0 7.8 2.4 10 8-.7 1.1-1.6 2.2-2.6 3.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path
                        d="M2 12c2.2-3.6 6.1-6 10-6s7.8 2.4 10 6c-2.2 3.6-6.1 6-10 6s-7.8-2.4-10-6z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="3.2" />
                    </svg>
                  )}
                </button>
              </span>
            </label>
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Rol
              <ThemedSelect
                name="role"
                value={role}
                onChange={setRole}
                disabled={!canAddUsers}
                options={[
                  { value: "admin", label: "Admin" },
                  { value: "tech", label: "Tech" },
                  { value: "owner", label: "Owner" },
                ]}
              />
            </label>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Link de invitación
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Comparte este enlace con tu equipo.
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
              disabled={!canAddUsers}
              className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar Admin
            </button>
            {!canAddUsers ? (
              <p className="text-xs text-slate-500">
                Solo owner o tech pueden agregar usuarios.
              </p>
            ) : null}
          </form>
        </div>
      </details>
    </section>
  );
}
