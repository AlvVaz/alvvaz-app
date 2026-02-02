"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminLoginFormProps = {
  hasUsers: boolean;
  serverError?: string;
};

type FormState = {
  error: string;
  pending: boolean;
};

export function AdminLoginForm({ hasUsers, serverError }: AdminLoginFormProps) {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ error: "", pending: false });
  const [showPassword, setShowPassword] = useState(false);

  const endpoint = hasUsers ? "/api/auth/login" : "/api/auth/setup";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ error: "", pending: true });

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal,
        credentials: "include",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? ((await response.json().catch(() => null)) as
            | { error?: string; ok?: boolean }
            | null)
        : null;

      if (!response.ok || payload?.error) {
        setState({
          error: payload?.error ?? "No se pudo iniciar sesión.",
          pending: false,
        });
        return;
      }

      if (payload?.ok === false) {
        setState({
          error: "No se pudo iniciar sesión.",
          pending: false,
        });
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        const sessionPayload = (await sessionResponse.json().catch(() => null)) as
          | { reason?: string }
          | null;
        const reason = sessionPayload?.reason;
        setState({
          error:
            reason === "invalid_cookie"
              ? "Sesión inválida (token rechazado)."
              : "No se pudo crear la sesión (cookie bloqueada o no guardada).",
          pending: false,
        });
        return;
      }

      window.location.href = "/admin";
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "La solicitud tardó demasiado. Intenta de nuevo."
          : "No se pudo conectar. Revisa el servidor.";
      setState({ error: message, pending: false });
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center gap-8">
      <div className="space-y-2 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Acceso interno
        </p>
        <h1 className="font-display text-3xl font-semibold text-brand-950">
          Panel AlvVaz
        </h1>
        <p className="text-sm text-slate-600">
          {hasUsers
            ? "Ingresa con tu usuario o correo."
            : "Crea la cuenta principal para comenzar."}
        </p>
      </div>

      <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-sm">
        {serverError ? (
          <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {serverError}
          </p>
        ) : null}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {hasUsers ? (
            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              Usuario o correo
              <input
                name="identifier"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
              />
            </label>
          ) : (
            <>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                Usuario
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold text-slate-700">
                Correo
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
                />
              </label>
            </>
          )}

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Contraseña
            <span className="relative block">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={hasUsers ? "current-password" : "new-password"}
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 inline-flex items-center justify-center text-slate-500 transition hover:text-brand-600"
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

          {state.error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={state.pending}
            className="w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {state.pending
              ? "Procesando..."
              : hasUsers
              ? "Entrar"
              : "Crear owner"}
          </button>

        </form>
      </div>
    </div>
  );
}
