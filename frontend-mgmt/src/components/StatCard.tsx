interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: string
  icon?: string
}

export default function StatCard({ label, value, sub, accent = 'text-slate-900', icon }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      {icon && <span className="text-2xl mt-0.5">{icon}</span>}
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-3xl font-bold mt-0.5 ${accent}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}
