import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

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

// Renders a self-contained HTML page (fonts and images inlined as data: URIs) to a
// US Letter PDF. Network requests are blocked, so nothing leaves the process.
export async function renderHtmlToPdf(html: string) {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 816, height: 1056 });

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
