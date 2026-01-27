export function slugify(value: string) {
  return value
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
