// Quote fonts live here. To change them, update both stacks and the PDF font
// files below (served from public/fonts). The preview uses the fonts loaded
// with next/font in app/layout.tsx.

export type QuoteFonts = {
  body: string;
  display: string;
};

export const QUOTE_PREVIEW_FONTS: QuoteFonts = {
  body: "var(--font-body), sans-serif",
  display: "var(--font-display-font), serif",
};

export const QUOTE_PDF_FONTS: QuoteFonts = {
  body: "'Manrope', sans-serif",
  display: "'Philosopher', serif",
};

export const QUOTE_PDF_FONT_FILES = [
  { family: "Manrope", file: "Manrope-Variable.ttf", weight: "200 800", style: "normal" },
  { family: "Philosopher", file: "Philosopher-Regular.ttf", weight: "400", style: "normal" },
  { family: "Philosopher", file: "Philosopher-Bold.ttf", weight: "700", style: "normal" },
  { family: "Philosopher", file: "Philosopher-Italic.ttf", weight: "400", style: "italic" },
];
