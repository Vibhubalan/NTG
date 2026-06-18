type Props = {
  children: React.ReactNode;
};

/** Short hint under admin section titles — where changes appear on the site. */
export default function AdminShowsOn({ children }: Props) {
  return (
    <div className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-400/80">
      <span className="font-semibold text-cyan-400/90 uppercase tracking-wide">Appears on:</span>
      <span>{children}</span>
    </div>
  );
}

export function AdminSection({
  title,
  showsOn,
  viewHref,
  viewLabel,
  children,
}: {
  title: string;
  showsOn: string;
  viewHref?: string;
  viewLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.06] bg-[#0c1424]/20 p-6 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-white/[0.08]">
      <div className="border-b border-white/[0.04] pb-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">{title}</h2>
          {viewHref ? (
            <a
              href={viewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 transition-colors"
            >
              <span>{viewLabel ?? "Preview"}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          ) : null}
        </div>
        <AdminShowsOn>{showsOn}</AdminShowsOn>
      </div>
      <div className="space-y-4 pt-1">
        {children}
      </div>
    </section>
  );
}

