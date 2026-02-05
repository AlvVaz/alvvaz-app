import { Container } from "@/components/container";
import { SectionHeading } from "@/components/section-heading";

const facebookPageUrl = "https://www.facebook.com/AgenciaAlvvaz/";

export default function SocialPage() {
  const embedSrc = `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(
    facebookPageUrl
  )}&tabs=timeline&width=500&height=720&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true`;

  return (
    <div className="pb-24 pt-12">
      <Container className="space-y-12">
        <SectionHeading
          title="Social"
          subtitle="Nuestras publicaciones más recientes desde Facebook."
          kicker="Comunidad"
        />

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                Facebook
              </p>
              <p className="text-sm text-slate-600">
                Síguenos para ver promociones, noticias y experiencias de viaje.
              </p>
            </div>

            <div className="h-[720px] w-full overflow-hidden rounded-2xl border border-slate-200">
              <iframe
                title="AlvVaz en Facebook"
                src={embedSrc}
                className="h-full w-full"
                loading="lazy"
                allow="encrypted-media"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <a
              href={facebookPageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 transition hover:text-brand-700"
            >
              Ver página en Facebook
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}
