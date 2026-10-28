export function slugify(value: string) {
  return value
    // Styled text copied from social media ("𝗦𝗔𝗟𝗜𝗗𝗔𝗦 𝟮𝟬𝟮𝟳") uses look-alike symbols;
    // NFKC turns them into plain letters/digits so they don't get stripped below.
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .trim();
}

export function parseTags(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatTags(tags: string[]) {
  return tags.join(", ");
}
