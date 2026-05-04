import { ArrowUpRight } from "lucide-react";

/**
 * StatCard - KPI display card for dashboard stats
 * From MockDashboard.tsx lines 115-128
 */

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
}

export const StatCard = ({ label, value, trend, trendUp }: StatCardProps) => (
  <div className="bg-white p-4 border border-ink-6 shadow-ww-sm">
    <div className="text-[10px] font-mono uppercase text-ink-4 mb-2">{label}</div>
    <div className="flex items-end justify-between">
      <div className="text-2xl font-medium text-ink-0">{value}</div>
      {trend && (
        <div className={`text-xs font-mono flex items-center gap-1 ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
          {trend}
          <ArrowUpRight className={`w-3 h-3 ${!trendUp && 'rotate-90'}`} />
        </div>
      )}
    </div>
  </div>
);
