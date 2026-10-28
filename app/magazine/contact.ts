import { getMagazineAdvisor } from "@/lib/db";

export type MagazineContact = { href: string; external: boolean; advisorName: string | null };

const GENERAL_CONTACT: MagazineContact = { href: "/contacto", external: false, advisorName: null };

// "Contactar" on a magazine: a WhatsApp chat with the admin who shared the link
// (?asesor=<admin id>), or the general contact page when there's no sender or no number.
export async function getMagazineContact(
  advisorId: string | undefined,
  issueTitle: string
): Promise<MagazineContact> {
  const advisor = advisorId ? await getMagazineAdvisor(advisorId) : null;
  // wa.me needs the country code; a 10-digit Mexican number gets 52 in front.
  const digits = advisor?.whatsapp?.replace(/\D/g, "") ?? "";
  const phone = digits.length === 10 ? `52${digits}` : digits;
  if (!advisor || phone.length < 10) return GENERAL_CONTACT;

  const advisorName = (advisor.username ?? "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  const firstName = advisorName.split(" ")[0];
  const message = `Hola${firstName ? ` ${firstName}` : ""}, vi la revista ${issueTitle} y quiero más información.`;
  return {
    href: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    external: true,
    advisorName: advisorName || null,
  };
}
