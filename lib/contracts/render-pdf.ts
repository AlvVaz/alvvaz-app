import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Contract } from "@/lib/db";
import { renderHtmlToPdf } from "@/lib/pdf/html-to-pdf";
import { formatTravelRange, isIsoDate, MONTHS_LONG, MONTHS_SHORT, parseIsoDate } from "@/lib/quotes/dates";

// Contract PDF, ported from design/contrato-reserva/contrato.html. Only the data
// changes per contract; policies, cancellation tiers and signatures are fixed text.

const PUBLIC_DIR = path.join(process.cwd(), "public");

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

async function toDataUri(file: string, mimeType: string) {
  const bytes = await readFile(path.join(PUBLIC_DIR, file));
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

// Optional "Subtítulo" from the form, stored in the contract's metadata.
export function getContractSubtitle(contract: Pick<Contract, "metadata">) {
  const value = contract.metadata?.subtitle;
  return typeof value === "string" ? value.trim() : "";
}

// "30 de septiembre 2026"
const formatLongDate = (value: string | null) => {
  if (!value || !isIsoDate(value)) return value ?? "";
  const date = parseIsoDate(value);
  return `${date.getDate()} de ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTravelDates = (start: string | null, end: string | null) => {
  const from = start && isIsoDate(start) ? start : null;
  const to = end && isIsoDate(end) ? end : null;
  if (from && to && from <= to) return formatTravelRange(from, to);
  if (from || to) return formatLongDate(from ?? to);
  return [start, end].filter(Boolean).join(" al ");
};

// Amounts are stored as typed ("5596", "$5,596.00"); unparseable values print as typed.
const parseMoney = (value: string | null) => {
  if (!value) return null;
  const amount = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(amount) ? amount : null;
};
const money = (amount: number, decimals: boolean) =>
  `$${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount)}`;
const formatMoney = (value: string | null, decimals: boolean) => {
  const amount = parseMoney(value);
  if (amount === null) return value ? escapeHtml(value) : "—";
  return money(amount, decimals);
};

// Description lines become rows; "2 x Habitación..." sets the quantity, other lines
// continue the previous row (same rules as the previous PDF).
const cleanLine = (line: string) =>
  line
    .replace(/ /g, " ")
    .replace(/[•●▪◦◾◼◻□■|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const isNoise = (line: string) => {
  const plain = line.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return !line || /^[zZxX]+$/.test(plain) || !/[A-Za-z0-9]/.test(plain);
};
function descriptionRows(description: string | null) {
  const rows: { qty: string; details: string }[] = [];
  for (const raw of (description ?? "").split(/\r?\n/)) {
    const line = cleanLine(raw);
    if (isNoise(line)) continue;
    const qtyMatch = line.match(/^(\d+)\s*[xX]\s*(.+)$/);
    if (qtyMatch) rows.push({ qty: qtyMatch[1], details: qtyMatch[2] });
    else if (!rows.length) rows.push({ qty: "1", details: line });
    else rows[rows.length - 1].details += ` ${line}`;
  }
  return rows.length ? rows : [{ qty: "1", details: "" }];
}

// Each line of "Notas" is shown as a chip under the description.
const noteChips = (notes: string | null) =>
  (notes ?? "")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line && !isNoise(line));

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");

const POLICIES = [
  '<strong>El primer anticipo <span class="flag">no es reembolsable</span>,</strong> endosable ni transferible a cualquier otro producto.',
  "Realiza los pagos conforme al calendario de pagos. La omisión puede ocasionar ajustes tarifarios o cancelaciones en los servicios descritos.",
  "Agencia Alvvaz y su titular no se hacen responsables por cancelaciones no planeadas por condiciones climatológicas, cierres de vialidades u otras situaciones ajenas a la empresa. Aun así, siempre tendrás nuestro respaldo para buscar una solución.",
  '<strong>Vuelos y servicios aéreos <span class="flag">no son reembolsables</span> por ningún motivo.</strong> Cualquier modificación de nombre, fecha, ruta, etc. queda sujeta a disponibilidad y aceptación de la aerolínea. Cambios de itinerario por parte de la aerolínea, retrasos o cancelaciones el mismo día del vuelo los consulta el pasajero directamente con la aerolínea en mostrador, deslindando a la agencia por la pérdida de servicios posteriores al vuelo. Siempre tendrás nuestro respaldo para buscar una solución.',
  "El cliente declara que la información proporcionada es verídica y confirmable. Las edades de menores a la llegada al hotel deben ser las mismas que se declararon al hacer la reserva.",
];

const CANCELLATION_TIERS: [string, string][] = [
  ["10%", "270 a 300 días antes"],
  ["30%", "180 a 269 días antes"],
  ["55%", "46 a 179 días antes"],
  ["85%", "16 a 45 días antes"],
  ["100%", "15 a 0 días antes"],
];

const CSS = `
:root{--navy:#1f2c42;--navy-2:#2b405a;--blue:#2c6faf;--sky:#3f9fc4;--mist:#bdd0e7;--ice:#eef3fa;--ink:#16202f;--muted:#5d6b80;--line:#d9e2ee;--rose:#c81e4a;--rose-soft:#fde8ee}
@page{size:Letter;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:8.5in}
body{font-family:Manrope,system-ui,sans-serif;color:var(--ink);font-size:9.5pt;line-height:1.4;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:8.5in;min-height:11in;position:relative;display:flex;flex-direction:column}
.pad{padding:0 0.5in}
.label{font-size:7pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.num{font-variant-numeric:tabular-nums}
header.pad{display:flex;align-items:center;gap:18px;padding-top:0.42in;padding-bottom:10px}
header .logo{width:1.12in;height:auto;flex:none}
header .titles{flex:1;min-width:0}
header .eyebrow{font-size:7.7pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--blue)}
header h1{font-family:Philosopher,Georgia,serif;font-weight:700;font-size:33pt;line-height:1;color:var(--navy);margin-top:3px}
header .tag{font-family:Philosopher,Georgia,serif;font-style:italic;font-size:11pt;color:var(--muted);margin-top:4px}
.meta{flex:none;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.badge{background:var(--navy);color:#fff;border-radius:999px;padding:6px 14px;font-weight:800;font-size:11.6pt;letter-spacing:.02em}
.badge span{font-size:7.3pt;letter-spacing:.16em;opacity:.7;margin-right:6px;font-weight:700}
.meta .date b{display:block;font-size:10.5pt;color:var(--ink)}
.waves{display:block;width:100%;height:30px}
.topline{display:block;width:100%;height:14px}
.client{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-top:13px}
.client .name{font-family:Philosopher,Georgia,serif;font-weight:700;font-size:17.6pt;color:var(--navy);line-height:1.1;margin-top:2px}
.client .status{font-size:7.7pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--blue);background:var(--ice);border-radius:999px;padding:5px 11px;white-space:nowrap}
.facts{display:grid;grid-template-columns:repeat(4,1fr);margin-top:8px;border:1px solid var(--line);border-radius:12px;overflow:hidden}
.fact{padding:7px 12px;border-left:1px solid var(--line)}
.fact:first-child{border-left:0}
.fact .v{font-weight:700;font-size:10.3pt;margin-top:2px}
.fact.trip{background:var(--ice)}
.fact.trip .v{color:var(--navy)}
.concept{margin-top:14px}
table{width:100%;border-collapse:collapse}
thead th{text-align:left;padding:0 0 6px;white-space:nowrap}
thead th:last-child,td.cost{text-align:right}
tbody td{padding:7px 0;border-top:1.5px solid var(--navy);vertical-align:top}
tbody tr+tr td{border-top:1px solid var(--line)}
td.qty{width:44px;font-weight:800;font-size:12.1pt;color:var(--blue)}
td.desc b{display:block;font-size:11pt;line-height:1.3}
td.cost{font-weight:800;font-size:12.1pt;white-space:nowrap;padding-left:12px}
.notes{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.chip{border-radius:999px;padding:3px 9px;font-size:8.1pt;font-weight:700;background:var(--ice);color:var(--navy-2)}
.money{display:grid;grid-template-columns:1fr 2.75in;gap:16px;margin-top:6px;align-items:stretch;break-inside:avoid}
.settle{border:1px dashed var(--mist);border-radius:12px;padding:12px 14px;display:flex;gap:14px;align-items:center}
.cal{width:52px;flex:none;border-radius:9px;overflow:hidden;text-align:center;border:1px solid var(--line)}
.cal .m{background:var(--blue);color:#fff;font-size:7.3pt;font-weight:800;letter-spacing:.14em;padding:3px 0}
.cal .d{font-family:Philosopher,Georgia,serif;font-weight:700;font-size:20.9pt;line-height:1.15;color:var(--navy)}
.cal .y{font-size:7.3pt;font-weight:700;color:var(--muted);padding-bottom:3px}
.settle .t b{display:block;font-size:11pt;color:var(--navy)}
.settle .t p{color:var(--muted);font-size:8.6pt;margin-top:2px}
.totals{border-radius:12px;overflow:hidden;border:1px solid var(--line)}
.trow{display:flex;justify-content:space-between;padding:7px 14px;border-top:1px solid var(--line)}
.trow:first-child{border-top:0}
.trow span{color:var(--muted);font-weight:600}
.trow b{font-weight:800}
.trow.paid b{color:#0b8a5f}
.trow.due{background:var(--navy);color:#fff;padding:10px 14px;align-items:baseline}
.trow.due span{color:#fff;opacity:.8;font-size:7.7pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
.trow.due b{font-size:16.5pt;letter-spacing:-.01em}
.trow.due small{font-size:7.7pt;font-weight:700;opacity:.75;margin-left:3px}
.thanks{text-align:center;margin-top:9px;font-family:Philosopher,Georgia,serif;font-size:12.1pt;color:var(--navy)}
.thanks i{color:var(--blue)}
.policies{margin-top:10px;background:var(--ice);border-radius:14px;padding:12px 16px 10px;break-inside:avoid}
.policies h2{font-family:Philosopher,Georgia,serif;font-size:13.2pt;color:var(--navy);display:flex;justify-content:space-between;align-items:baseline}
.policies ul{list-style:none;columns:2;column-gap:20px;margin-top:5px}
.policies li{break-inside:avoid;position:relative;padding-left:11px;font-size:8.5pt;line-height:1.35;color:#2f3b4d;margin-bottom:4px}
.policies li::before{content:"";position:absolute;left:0;top:.5em;width:4px;height:4px;border-radius:50%;background:var(--blue)}
.policies li strong{color:var(--ink)}
.flag{color:var(--rose);font-weight:800}
.cancel{margin-top:6px}
.cancel .label{margin-bottom:4px;display:block}
.tiers{display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.tier{background:#fff;border-radius:8px;padding:5px 4px;text-align:center}
.tier b{display:block;font-size:12.7pt;font-weight:800;color:var(--navy)}
.tier span{font-size:7.3pt;color:var(--muted);font-weight:600}
.tier:nth-child(1) b{color:#2c6faf}.tier:nth-child(2) b{color:#2a5d93}.tier:nth-child(3) b{color:#2b4a74}.tier:nth-child(4) b{color:#8a2a4f}.tier:nth-child(5){background:var(--rose-soft)}.tier:nth-child(5) b{color:var(--rose)}
.accept{text-align:center;font-size:8.4pt;color:var(--muted);margin-top:10px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:0.6in;margin-top:32px;break-inside:avoid}
.sig{border-top:1.2px solid var(--navy);padding-top:5px;text-align:center}
.sig b{display:block;font-size:9.2pt}
.sig span{font-size:7.3pt}
footer{margin-top:auto;position:relative;break-inside:avoid}
footer .waves{height:34px}
.foot{background:var(--navy);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:9px 0.5in 0.24in;font-size:7.9pt}
.foot .addr{opacity:.9}
.foot .addr b{font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:7.3pt;opacity:.7;display:block;margin-bottom:1px}
.foot .motto{font-family:Philosopher,Georgia,serif;font-style:italic;font-size:11pt;text-align:right;white-space:nowrap}
`;

export async function buildContractHtml(contract: Contract) {
  const [manrope, philosopherRegular, philosopherBold, philosopherItalic, logo] = await Promise.all([
    toDataUri("fonts/Manrope-Variable.ttf", "font/ttf"),
    toDataUri("fonts/Philosopher-Regular.ttf", "font/ttf"),
    toDataUri("fonts/Philosopher-Bold.ttf", "font/ttf"),
    toDataUri("fonts/Philosopher-Italic.ttf", "font/ttf"),
    toDataUri("logoalvvaz.png", "image/png"),
  ]);

  const e = (value: string | null | undefined) => escapeHtml(value ?? "");
  const subtitle = getContractSubtitle(contract);
  const number = (contract.contractNumber ?? "").replace(/^#+/, "").trim();
  const clientName = contract.clientName.trim();
  const seller = titleCase(contract.seller ?? contract.organizer ?? "");
  const rows = descriptionRows(contract.description);
  const chips = noteChips(contract.notes);

  const total = parseMoney(contract.totalPrice);
  const first = parseMoney(contract.firstPayment);
  const balance = parseMoney(contract.balanceDue) ?? (total !== null && first !== null ? total - first : null);

  const liquidation = contract.liquidationDate && isIsoDate(contract.liquidationDate)
    ? parseIsoDate(contract.liquidationDate)
    : null;

  const rowsHtml = rows
    .map(
      (row, index) => `<tr>
          <td class="qty num">${e(row.qty)}</td>
          <td class="desc"><b>${e(row.details)}</b>${
            index === 0 && chips.length
              ? `<div class="notes">${chips.map((chip) => `<span class="chip">${e(chip)}</span>`).join("")}</div>`
              : ""
          }</td>
          <td class="cost num">${index === 0 ? formatMoney(contract.totalPrice, false) : ""}</td>
        </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Reserva de viaje · Contrato ${number ? `#${e(number)}` : ""}</title>
<style>
@font-face{font-family:Manrope;font-weight:200 800;src:url(${manrope}) format('truetype')}
@font-face{font-family:Philosopher;font-weight:400;src:url(${philosopherRegular}) format('truetype')}
@font-face{font-family:Philosopher;font-weight:700;src:url(${philosopherBold}) format('truetype')}
@font-face{font-family:Philosopher;font-style:italic;src:url(${philosopherItalic}) format('truetype')}
${CSS}
</style>
</head>
<body>
<div class="page">
  <header class="pad">
    <img class="logo" src="${logo}" alt="AlvVaz Agencia de Viajes">
    <div class="titles">
      <div class="eyebrow">Reserva de viaje</div>
      <h1>${e(contract.destination || contract.title)}</h1>
      ${subtitle ? `<div class="tag">${e(subtitle)}</div>` : ""}
    </div>
    <div class="meta">
      ${number ? `<div class="badge num"><span>CONTRATO</span>#${e(number)}</div>` : ""}
      <div class="date"><span class="label">Fecha de reserva</span><b>${e(formatLongDate(contract.reservationDate)) || "—"}</b></div>
    </div>
  </header>

  <svg class="topline" viewBox="0 0 816 14" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 7 C 140 2, 260 12, 420 7 S 700 2, 816 7" fill="none" stroke="#bdd0e7" stroke-width="1.4"/>
  </svg>

  <div class="pad">
    <section class="client">
      <div>
        <div class="label">Nombre del cliente</div>
        <div class="name">${e(clientName)}</div>
      </div>
      <div class="status">Paquete de promoción</div>
    </section>

    <section class="facts">
      <div class="fact"><div class="label">Vendedor</div><div class="v">${e(seller) || "—"}</div></div>
      <div class="fact"><div class="label">Agencia</div><div class="v">${e(contract.agency) || "—"}</div></div>
      <div class="fact"><div class="label">Destino</div><div class="v">${e(contract.destination) || "—"}</div></div>
      <div class="fact trip"><div class="label">Fechas de viaje</div><div class="v">${e(formatTravelDates(contract.departureDate, contract.returnDate)) || "—"}</div></div>
    </section>

    <section class="concept">
      <table>
        <thead><tr><th class="label">Cant.</th><th class="label">Descripción de lo contratado</th><th class="label">Costo (MXN)</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </section>

    <section class="money">
      <div class="settle">
        ${
          liquidation
            ? `<div class="cal"><div class="m">${MONTHS_SHORT[liquidation.getMonth()]}</div><div class="d num">${liquidation.getDate()}</div><div class="y num">${liquidation.getFullYear()}</div></div>`
            : ""
        }
        <div class="t">
          <span class="label">Liquidación del viaje</span>
          <b>${e(formatLongDate(contract.liquidationDate)) || "—"}</b>
          <p>Consulta tu plan de pagos para la liquidación de tu reserva.</p>
        </div>
      </div>
      <div class="totals num">
        <div class="trow"><span>Precio neto</span><b>${formatMoney(contract.totalPrice, true)}</b></div>
        <div class="trow paid"><span>Primer pago</span><b>${first !== null ? `− ${money(first, true)}` : "—"}</b></div>
        <div class="trow due"><span>Resto por pagar</span><b>${balance !== null ? money(balance, true) : "—"}<small>MXN</small></b></div>
      </div>
    </section>

    <p class="thanks"><i>Gracias por tu confianza.</i></p>

    <section class="policies">
      <h2>Políticas generales <span class="label">Lee antes de firmar</span></h2>
      <ul>${POLICIES.map((policy) => `<li>${policy}</li>`).join("")}</ul>
      <div class="cancel">
        <span class="label">Cancelaciones de hotelería · penalidad sobre el total del viaje contratado</span>
        <div class="tiers num">${CANCELLATION_TIERS.map(([pct, when]) => `<div class="tier"><b>${pct}</b><span>${when}</span></div>`).join("")}</div>
      </div>
    </section>

    <p class="accept">Al firmar este documento, el cliente acepta haber leído y estar conforme con las políticas.</p>

    <section class="sigs">
      <div class="sig"><b>${e(clientName)}</b><span class="label">Firma del cliente</span></div>
      <div class="sig"><b>Agencia Alvvaz</b><span class="label">Firma y sello de la agencia</span></div>
    </section>
  </div>

  <footer>
    <svg class="waves" viewBox="0 0 816 34" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 22 C 160 30, 320 6, 480 14 S 720 28, 816 18 L816 34 L0 34Z" fill="#bdd0e7"/>
      <path d="M0 26 C 180 32, 340 12, 500 19 S 740 30, 816 23 L816 34 L0 34Z" fill="#3f9fc4"/>
      <path d="M0 29 C 170 34, 360 18, 520 24 S 760 32, 816 27 L816 34 L0 34Z" fill="#2c6faf"/>
      <path d="M0 32 C 190 35, 380 25, 540 29 S 770 34, 816 31 L816 34 L0 34Z" fill="#1f2c42"/>
    </svg>
    <div class="foot">
      <div class="addr"><b>Agencia de Viajes Alvvaz</b>Hernán Cortés #508-A, Col. Industrial Aviación &nbsp;·&nbsp; Calle 30 #689, Villas del Sol</div>
      <div class="motto">Más de 10 años nos respaldan</div>
    </div>
  </footer>
</div>
</body>
</html>`;
}

export async function renderContractPdf(contract: Contract) {
  return renderHtmlToPdf(await buildContractHtml(contract));
}
