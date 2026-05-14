import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderInstallmentRow = {
  id: string;
  installment_number: number;
  due_date: string;
  amount: string | number;
  payment_plans:
    | {
        contract_id: string;
        frequency: string;
      }
    | {
        contract_id: string;
        frequency: string;
      }[]
    | null;
};

function getMexicoCityDateOnly(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function addDays(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Mexico_City",
  }).format(date);
}

function formatAmount(value: string | number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(number);
}

function getPrimaryPhone(travelers: unknown) {
  if (!Array.isArray(travelers)) return null;
  for (const traveler of travelers) {
    if (!traveler || typeof traveler !== "object" || !("phone" in traveler)) continue;
    const phone = String(traveler.phone ?? "").trim();
    if (phone) return phone;
  }
  return null;
}

function buildWhatsAppUrl(phone: string | null) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    digits = `52${digits}`;
  }
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}`;
}

function getPlan(row: ReminderInstallmentRow) {
  return Array.isArray(row.payment_plans) ? row.payment_plans[0] : row.payment_plans;
}

function buildLine(
  row: ReminderInstallmentRow,
  contract: {
    id: string;
    contractNumber: string | null;
    clientName: string;
    destination: string;
    whatsappUrl: string | null;
  } | null
) {
  const folio = contract?.contractNumber ? `#${contract.contractNumber}` : "Sin folio";
  const contractId = contract?.id ? `ID: ${contract.id}` : "ID no disponible";
  const client = contract?.clientName ?? "Cliente sin nombre";
  const destination = contract?.destination ?? "Destino no disponible";
  const whatsappLine = contract?.whatsappUrl ? `  WhatsApp: ${contract.whatsappUrl}` : null;

  return [
    `• ${folio} · Pago #${row.installment_number}`,
    `  ${client}`,
    `  ${destination}`,
    `  ${formatAmount(row.amount)} · ${formatDate(row.due_date)}`,
    whatsappLine,
    `  ${contractId}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildSection({
  title,
  emptyLabel,
  rows,
  contractsById,
}: {
  title: string;
  emptyLabel: string;
  rows: ReminderInstallmentRow[];
  contractsById: Map<
    string,
    {
      id: string;
      contractNumber: string | null;
      clientName: string;
      destination: string;
      whatsappUrl: string | null;
    }
  >;
}) {
  if (rows.length === 0) {
    return [title, `  ${emptyLabel}`];
  }

  return [
    title,
    ...rows.map((row) => buildLine(row, contractsById.get(getPlan(row)?.contract_id ?? "") ?? null)),
  ];
}

function buildReminderMessage({
  today,
  overdue,
  dueToday,
  upcoming,
  contractsById,
}: {
  today: string;
  overdue: ReminderInstallmentRow[];
  dueToday: ReminderInstallmentRow[];
  upcoming: ReminderInstallmentRow[];
  contractsById: Map<
    string,
    {
      id: string;
      contractNumber: string | null;
      clientName: string;
      destination: string;
      whatsappUrl: string | null;
    }
  >;
}) {
  const total = overdue.length + dueToday.length + upcoming.length;
  if (total === 0) {
    return [
      `✅ Pagos pendientes · ${formatDate(today)}`,
      "",
      "Todo tranquilo por ahora.",
      "No hay pagos vencidos, para hoy o proximos 7 dias.",
    ].join("\n");
  }

  const sections = [
    `💳 Pagos pendientes · ${formatDate(today)}`,
    "",
    `Resumen: ${total} pago(s)`,
    `🔴 Vencidos: ${overdue.length}`,
    `🟡 Vencen hoy: ${dueToday.length}`,
    `🗓 Proximos 7 dias: ${upcoming.length}`,
    "",
    ...buildSection({
      title: "🔴 Vencidos",
      emptyLabel: "Sin pagos vencidos.",
      rows: overdue,
      contractsById,
    }),
    "",
    ...buildSection({
      title: "🟡 Vencen hoy",
      emptyLabel: "Nada para hoy.",
      rows: dueToday,
      contractsById,
    }),
    "",
    ...buildSection({
      title: "🗓 Proximos 7 dias",
      emptyLabel: "Nada en los proximos 7 dias.",
      rows: upcoming,
      contractsById,
    }),
  ];

  return sections.join("\n").slice(0, 3900);
}

function buildSampleReminderMessage(today: string, samplePhone?: string | null) {
  const sampleWhatsAppUrl = buildWhatsAppUrl(samplePhone ?? null) ?? "https://wa.me/525512345678";
  const overdue: ReminderInstallmentRow[] = [
    {
      id: "sample-overdue",
      installment_number: 2,
      due_date: addDays(today, -3),
      amount: "2500.00",
      payment_plans: {
        contract_id: "sample-contract-1",
        frequency: "semanal",
      },
    },
  ];
  const dueToday: ReminderInstallmentRow[] = [
    {
      id: "sample-today",
      installment_number: 1,
      due_date: today,
      amount: "1800.00",
      payment_plans: {
        contract_id: "sample-contract-2",
        frequency: "quincenal",
      },
    },
  ];
  const upcoming: ReminderInstallmentRow[] = [
    {
      id: "sample-upcoming",
      installment_number: 4,
      due_date: addDays(today, 5),
      amount: "3200.00",
      payment_plans: {
        contract_id: "sample-contract-3",
        frequency: "mensual",
      },
    },
  ];
  const contractsById = new Map([
    [
      "sample-contract-1",
      {
        id: "sample-contract-1",
        contractNumber: "2145",
        clientName: "Ana Perez",
        destination: "Cancun",
        whatsappUrl: sampleWhatsAppUrl,
      },
    ],
    [
      "sample-contract-2",
      {
        id: "sample-contract-2",
        contractNumber: "2150",
        clientName: "Luis Gomez",
        destination: "Los Cabos",
        whatsappUrl: "https://wa.me/525598765432",
      },
    ],
    [
      "sample-contract-3",
      {
        id: "sample-contract-3",
        contractNumber: "2160",
        clientName: "Maria Ruiz",
        destination: "Nueva York",
        whatsappUrl: "https://wa.me/525533221100",
      },
    ],
  ]);

  return {
    message: buildReminderMessage({
      today,
      overdue,
      dueToday,
      upcoming,
      contractsById,
    }),
    counts: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
    },
  };
}

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function unauthorizedResponse(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authorization = request.headers.get("authorization") ?? "";
  return NextResponse.json(
    {
      error: "Unauthorized",
      debug: {
        hasCronSecret: Boolean(process.env.CRON_SECRET),
        cronSecretLength: process.env.CRON_SECRET?.length ?? 0,
        authorizationLength: authorization.length,
        expectedAuthorizationLength: process.env.CRON_SECRET
          ? `Bearer ${process.env.CRON_SECRET}`.length
          : 0,
      },
    },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse(request);
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const sample = url.searchParams.get("sample") === "1";
  const today = getMexicoCityDateOnly();
  const soon = addDays(today, 7);

  if (sample) {
    const sampleReminder = buildSampleReminderMessage(today, url.searchParams.get("phone"));
    if (!dryRun) {
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (!chatId) {
        return NextResponse.json({ error: "Missing TELEGRAM_CHAT_ID." }, { status: 500 });
      }
      await sendTelegramMessage({ chatId, text: sampleReminder.message });
    }

    return NextResponse.json({
      ok: true,
      dryRun,
      sample: true,
      counts: sampleReminder.counts,
      message: sampleReminder.message,
    });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_installments")
    .select("id, installment_number, due_date, amount, payment_plans!inner(contract_id, frequency)")
    .eq("status", "pendiente")
    .lte("due_date", soon)
    .order("due_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as ReminderInstallmentRow[]).filter((row) => Boolean(getPlan(row)));
  const contractIds = Array.from(
    new Set(rows.map((row) => getPlan(row)?.contract_id).filter((id): id is string => Boolean(id)))
  );

  const contracts = contractIds.length
    ? await prisma.contract.findMany({
        where: { id: { in: contractIds } },
        select: {
          id: true,
          contractNumber: true,
          clientName: true,
          destination: true,
          travelers: true,
        },
      })
    : [];

  const contractsById = new Map(
    contracts.map((contract) => [
      contract.id,
      {
        id: contract.id,
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        destination: contract.destination,
        whatsappUrl: buildWhatsAppUrl(getPrimaryPhone(contract.travelers)),
      },
    ])
  );

  const overdue = rows.filter((row) => row.due_date < today);
  const dueToday = rows.filter((row) => row.due_date === today);
  const upcoming = rows.filter((row) => row.due_date > today && row.due_date <= soon);
  const message = buildReminderMessage({
    today,
    overdue,
    dueToday,
    upcoming,
    contractsById,
  });

  if (!dryRun) {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      return NextResponse.json({ error: "Missing TELEGRAM_CHAT_ID." }, { status: 500 });
    }
    await sendTelegramMessage({ chatId, text: message });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    counts: {
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
    },
    message,
  });
}
