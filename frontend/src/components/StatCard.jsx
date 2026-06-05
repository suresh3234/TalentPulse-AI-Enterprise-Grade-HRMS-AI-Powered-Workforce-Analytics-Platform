import { Minus, TrendingDown, TrendingUp } from "lucide-react";

export default function StatCard({
  icon,
  label,
  value,
  trend,
  trendLabel,
  trendType = "up",
  badge,
  badgeColor,
}) {
  const trendIcon =
    trendType === "up" ? (
      <TrendingUp size={12} />
    ) : trendType === "down" ? (
      <TrendingDown size={12} />
    ) : (
      <Minus size={12} />
    );

  const trendColor =
    trendType === "up"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : trendType === "down"
        ? "border-red-200 bg-red-50 text-red-700"
        : "border-slate-200 bg-slate-100 text-slate-600";

  return (
    <div className="group relative overflow-hidden rounded-[26px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.10),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_12px_34px_-22px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_38px_-24px_rgba(37,99,235,0.35)] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#0f172a_0%,#2563eb_55%,#14b8a6_100%)] opacity-80" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#dbeafe_55%,#ecfeff_100%)] text-blue-700 shadow-sm">
          {icon}
        </div>

        {trend ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${trendColor}`}
          >
            {trendIcon}
            {trend}
          </span>
        ) : null}

        {!trend && badge ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              badgeColor || "bg-red-100 text-red-700"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="my-4 h-px w-full bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />

      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
          {label}
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
          {value}
        </div>
        {trendLabel ? (
          <div className="mt-2 text-xs leading-relaxed text-slate-500">
            {trendLabel}
          </div>
        ) : (
          <div className="mt-2 text-xs text-slate-400">Live HR signal</div>
        )}
      </div>

      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-blue-100/40 blur-2xl transition duration-300 group-hover:bg-cyan-100/50" />
      <div className="pointer-events-none absolute -left-6 top-14 h-16 w-16 rounded-full bg-slate-100/70 blur-2xl" />
    </div>
  );
}
