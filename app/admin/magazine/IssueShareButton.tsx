"use client";

type IssueShareButtonProps = {
  slug: string;
  title: string;
};

export default function IssueShareButton({ slug, title }: IssueShareButtonProps) {
  const handleClick = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/magazine/${slug}/share`;
    const message = `Hola, aquí está la revista ${title}: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700"
    >
      Enviar
    </button>
  );
}
