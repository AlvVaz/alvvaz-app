export default function AdminLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-brand-200" />
        <div className="h-8 w-64 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-full bg-slate-100" />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </section>

      <div className="space-y-4">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-3">
                <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                <div className="h-3 w-64 max-w-full animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-8 w-28 animate-pulse rounded-full bg-brand-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
