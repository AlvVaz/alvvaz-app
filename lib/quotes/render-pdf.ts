import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import { QuoteDocument, QUOTE_DOCUMENT_RESET_CSS } from "@/components/quotes/QuoteDocument";
import { QUOTE_PDF_FONT_FILES, QUOTE_PDF_FONTS } from "@/lib/quotes/fonts";
import { formatQuoteHotels, type QuoteData } from "@/lib/quotes/types";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const LOGO_FILE = "logoalvvaz.png";

// Next.js rejects static react-dom/server imports in app routes, so the
// renderer is loaded from node_modules at runtime (see next.config.ts tracing).
async function loadStaticRenderer() {
  const mod = await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ "react-dom/server");
  return mod.renderToStaticMarkup;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

async function toDataUri(filePath: string, mimeType: string) {
  const bytes = await readFile(filePath);
  return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

async function buildFontFaceCss() {
  const rules = await Promise.all(
    QUOTE_PDF_FONT_FILES.map(async (font) => {
      const src = await toDataUri(path.join(PUBLIC_DIR, "fonts", font.file), "font/ttf");
      return `@font-face { font-family: '${font.family}'; src: url(${src}) format('truetype'); font-weight: ${font.weight}; font-style: ${font.style}; }`;
    })
  );
  return rules.join("\n");
}

// Same <head> styles as docs/cotizaciones/cotizacion-template.html, with the
// fonts embedded so the render needs no network access.
export async function buildQuoteHtml(data: QuoteData, folio: string) {
  const [fontFaceCss, logoSrc, renderToStaticMarkup] = await Promise.all([
    buildFontFaceCss(),
    toDataUri(path.join(PUBLIC_DIR, LOGO_FILE), "image/png"),
    loadStaticRenderer(),
  ]);

  const body = renderToStaticMarkup(
    createElement(QuoteDocument, {
      data,
      folio,
      logoSrc,
      fonts: QUOTE_PDF_FONTS,
      className: "page",
    })
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cotización #${escapeHtml(folio)} · ${escapeHtml(data.title || formatQuoteHotels(data))}</title>
<style>
${fontFaceCss}
@page { size: letter; margin: 0; }
html, body { margin: 0; padding: 0; background: #e9edf3; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 816px; height: 1056px; margin: 24px auto; box-shadow: 0 4px 24px rgba(28,41,66,0.12); }
@media print {
  html, body { background: #ffffff; }
  .page { margin: 0; box-shadow: none; }
}
${QUOTE_DOCUMENT_RESET_CSS}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

async function launchBrowser() {
  // Local dev uses an installed Chrome; serverless uses the bundled Chromium.
  const localExecutable = process.env.CHROME_EXECUTABLE_PATH;
  if (localExecutable) {
    return puppeteer.launch({ executablePath: localExecutable, headless: true });
  }
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
}

export async function renderQuotePdf(data: QuoteData, folio: string) {
  const html = await buildQuoteHtml(data, folio);
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });

    // Everything is inlined; block any request that would leave the process.
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url().startsWith("data:")) {
        void request.continue();
      } else {
        void request.abort();
      }
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
