"use client";

import Link from "next/link";

import { Container } from "@/components/container";

export function Footer() {
  const showReservations = false;

  return (
    <footer className="border-t border-slate-100 bg-white">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.3fr_1fr_1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-950 text-sm font-semibold text-white">
              AV
            </span>
            <span className="font-display text-lg font-semibold text-brand-950">
              AlvVaz
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Agencia de viajes mexicana especializada en experiencias premium en
            playas de México y destinos internacionales.
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
            Contacto
          </p>
          <p>WhatsApp: +52 (444) 171-74-05</p>
          <p>Email: miguelalvarado@alvvaz.com</p>
          <p>Horario: Lun a Sab - 9:00 a 20:00</p>
        </div>

        <div className="space-y-4 text-sm text-slate-600">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Enlaces
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/servicios" className="hover:text-brand-700">
                Servicios
              </Link>
              <Link href="/promociones" className="hover:text-brand-700">
                Promociones
              </Link>
              {showReservations ? (
                <Link href="/reservaciones" className="hover:text-brand-700">
                  Reservaciones
                </Link>
              ) : null}
              <Link href="/contacto" className="hover:text-brand-700">
                Contáctanos
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
              Redes
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://instagram.com"
                className="hover:text-brand-700"
                target="_blank"
                rel="noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://facebook.com"
                className="hover:text-brand-700"
                target="_blank"
                rel="noreferrer"
              >
                Facebook
              </a>
              <a
                href="https://linkedin.com"
                className="hover:text-brand-700"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </Container>

      <div className="border-t border-slate-100">
        <Container className="flex flex-col items-start justify-between gap-4 py-6 text-xs text-slate-500 md:flex-row md:items-center">
          <p>(c) 2024 AlvVaz. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <Link
              href="/politicas-de-privacidad"
              className="transition-colors hover:text-brand-600"
            >
              Políticas de privacidad
            </Link>
            <Link
              href="/admin/login"
              className="text-[11px] uppercase tracking-[0.2em] text-slate-400 transition-colors hover:text-brand-600"
            >
              Acceso interno
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
