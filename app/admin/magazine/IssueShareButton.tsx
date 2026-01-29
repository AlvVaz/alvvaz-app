"use client";

type IssueShareButtonProps = {
  slug: string;
  title: string;
  deleteAction: (formData: FormData) => void;
  issueId: string;
};

export default function IssueShareButton({
  slug,
  title,
  deleteAction,
  issueId,
}: IssueShareButtonProps) {
  const handleClick = () => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/magazine/${slug}/share`;
    const message = `Hola, aquí está la revista ${title}: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex rounded-full border border-brand-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700"
      >
        Enviar
      </button>
      <form
        action={deleteAction}
        onSubmit={(event) => event.stopPropagation()}
        className="inline-flex"
      >
        <input type="hidden" name="id" value={issueId} />
        <button
          type="submit"
          className="inline-flex rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700 shadow-sm hover:border-rose-400 hover:text-rose-800"
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}
