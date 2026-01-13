import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  kicker?: string;
  align?: "left" | "center";
};

export function SectionHeading({
  title,
  subtitle,
  kicker,
  align = "left",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "space-y-4",
        align === "center" ? "text-center" : "text-left"
      )}
    >
      {kicker ? (
        <p className="text-lg font-semibold uppercase tracking-[0.32em] text-brand-600">
          {kicker}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-semibold tracking-tight text-brand-950 md:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-base text-slate-600 md:text-lg">{subtitle}</p>
      ) : null}
    </div>
  );
}
