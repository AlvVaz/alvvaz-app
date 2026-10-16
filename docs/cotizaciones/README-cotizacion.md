# Cotización template: handoff notes

## Files
- `cotizacion-template.html`: the template. Mustache syntax (`{{field}}`, `{{#list}}…{{/list}}`). The full field list is in the comment at the top of the file.
- `ejemplo-datos.json`: sample data for the Hotel Flamingo Cancún quote. Rendering the template with this data gives the reference design.
- `cotizacion-ejemplo.html`: the template already rendered with the sample data, with the logo embedded. Open it in a browser to see the target, 1:1.
- `logo-alvvaz.png`: the logo. Put it in `public/` and point `logoUrl` at it.

## Rules
- The output must match `cotizacion-ejemplo.html` pixel for pixel: page is 816×1056 px (US Letter), same colors, spacing and font sizes. Keep the styles exactly as written.
- One hotel per quote. (The app now quotes three hotel options per quote; see `feat-quoting.md`.)
- Every value is typed in by hand in the quoting form. Nothing is calculated (deposit, liquidation date, etc.).
- Money values are entered without "$". The template adds "$" and, in the sidebar total only, ".00".
- `stars` is an array with one empty object per star (4 stars = `[{},{},{},{}]`).
- The "Incluye" list starts pre-filled with the 9 default items from `ejemplo-datos.json`. In the form, the user can add or remove items as free text. Each item is `{ title?, detail?, note? }`:
  - `title`: bold
  - `detail`: normal text
  - `note`: red text in parentheses
- Fixed text (never changes): labels, the "Plan Todo Incluido" badge, "Costo en pesos", the payment paragraph (only `depositPerPerson` changes), the disclaimer, "Más de 10 años nos respaldan", the addresses, and "Gracias por tu confianza".
- Fonts: Manrope (body) and Philosopher (display). The app already loads these with `next/font`, so the Google Fonts `<link>` can be swapped for that.
- Print/PDF: the template has `@page { size: letter; margin: 0 }` and print color-adjust, so browser print-to-PDF matches the screen.
