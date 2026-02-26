import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number | null;   // percentage growth vs last period
  icon: LucideIcon;
  iconClassName?: string;   // e.g. "text-emerald-500"
  wrapperClassName?: string; // optional border accent
}

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconClassName = 'text-blue-500',
  wrapperClassName = '',
}: StatCardProps) {
  const hasChange = change !== null && change !== undefined;
  const isPositive = hasChange && change! > 0;
  const isNeutral  = hasChange && change! === 0;

  return (
    <div
      className={`
        relative bg-white rounded-2xl p-5 shadow-sm
        border border-slate-100 hover:shadow-md
        transition-all duration-200 overflow-hidden group
        ${wrapperClassName}
      `}
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative flex items-start justify-between gap-3">
        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
            {title}
          </p>
          <p className="text-2xl font-extrabold text-slate-900 leading-none truncate">
            {value}
          </p>

          {subtitle && (
            <p className="mt-1.5 text-xs text-slate-400 truncate">{subtitle}</p>
          )}

          {hasChange && (
            <div
              className={`
                inline-flex items-center gap-1 mt-2.5 px-2 py-0.5 rounded-full text-[11px] font-bold
                ${isNeutral  ? 'bg-slate-100 text-slate-500' :
                  isPositive ? 'bg-emerald-50 text-emerald-600' :
                               'bg-red-50 text-red-500'}
              `}
            >
              {isNeutral  ? <Minus size={10} /> :
               isPositive ? <TrendingUp size={10} /> :
                            <TrendingDown size={10} />}
              <span>
                {isPositive ? '+' : ''}{change!.toFixed(1)}% vs last month
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <Icon size={20} className={iconClassName} />
        </div>
      </div>
    </div>
  );
}