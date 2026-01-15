interface HostStatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: 'emerald' | 'sky' | 'amber';
  description: string;
}

const toneStyles: Record<HostStatsCardProps['tone'], string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  amber: 'bg-amber-100 text-amber-700',
};

const HostStatsCard = ({ title, value, icon, tone, description }: HostStatsCardProps) => {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface-strong p-5 shadow-soft">
      <div className={`rounded-2xl p-3 ${toneStyles[tone]}`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
        <p className="text-2xl font-semibold text-ink">{value}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  );
};

export default HostStatsCard;
