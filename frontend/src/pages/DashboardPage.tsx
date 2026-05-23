import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchConsultations } from '../api/consultations'
import { useAuthStore } from '../store/auth'
import type { Consultation, ConsultationOutcome } from '../types'

const OUTCOME_CONFIG: Record<ConsultationOutcome, { label: string; badge: string; border: string }> = {
  treated_and_discharged:  { label: 'Discharged', badge: 'bg-emerald-100 text-emerald-800', border: 'border-l-emerald-400' },
  referred:                { label: 'Referred',   badge: 'bg-blue-100 text-blue-800',       border: 'border-l-blue-400'    },
  admitted:                { label: 'Admitted',   badge: 'bg-amber-100 text-amber-800',     border: 'border-l-amber-400'   },
  follow_up_scheduled:     { label: 'Follow-up',  badge: 'bg-violet-100 text-violet-800',   border: 'border-l-violet-400'  },
  left_without_being_seen: { label: 'LWBS',       badge: 'bg-gray-100 text-gray-600',       border: 'border-l-gray-300'    },
  deceased:                { label: 'Deceased',   badge: 'bg-red-100 text-red-800',         border: 'border-l-red-400'     },
}

function StatCard({
  label, value, from, to, textColor, mutedColor, icon,
}: {
  label: string
  value: number
  from: string
  to: string
  textColor: string
  mutedColor: string
  icon: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${from} ${to} shadow-sm`}>
      <span className="absolute -right-3 -bottom-2 text-[4.5rem] leading-none select-none pointer-events-none opacity-[0.13]">
        {icon}
      </span>
      <p className={`text-3xl font-extrabold leading-none ${textColor}`}>{value}</p>
      <p className={`text-[11px] font-bold uppercase tracking-wider mt-2 ${mutedColor}`}>{label}</p>
    </div>
  )
}

function ConsultationRow({ c }: { c: Consultation }) {
  const cfg = OUTCOME_CONFIG[c.outcome]
  return (
    <Link
      to={`/consultation/${c.id}`}
      className={`flex items-center gap-3 bg-white rounded-xl border border-gray-100 border-l-4 ${cfg.border} p-4 hover:shadow-md hover:-translate-y-px transition-all duration-150`}
    >
      <div className="text-sm text-gray-400 font-mono w-12 shrink-0 tabular-nums">
        {format(new Date(c.started_at), 'HH:mm')}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">Patient #{c.patient_id}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{c.chief_complaint}</p>
      </div>
      <span className={`shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 ${cfg.badge}`}>
        {cfg.label}
      </span>
    </Link>
  )
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return { word: 'morning',   emoji: '☀️'  }
  if (h < 17) return { word: 'afternoon', emoji: '🌤️' }
  return            { word: 'evening',   emoji: '🌙'  }
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const today = format(new Date(), 'yyyy-MM-dd')
  const { word, emoji } = timeGreeting()

  const { data: consultations = [], isLoading, isError } = useQuery({
    queryKey: ['consultations', today],
    queryFn: () => fetchConsultations(today),
    refetchInterval: 30_000,
  })

  const referrals  = consultations.filter(c => c.outcome === 'referred').length
  const admissions = consultations.filter(c => c.outcome === 'admitted').length

  return (
    <div className="space-y-5">

      {/* Greeting banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 p-5 text-white shadow-lg">
        <span className="absolute -right-6 -top-6 text-[8rem] leading-none select-none pointer-events-none opacity-[0.07]">
          🏥
        </span>
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
        <h2 className="text-2xl font-extrabold mt-1 leading-tight">
          {emoji} Good {word}, {user?.first_name}!
        </h2>
        <p className="text-sm mt-1 opacity-50 capitalize">
          {user?.role?.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Consults"
          value={consultations.length}
          from="from-emerald-50"
          to="to-emerald-100"
          textColor="text-emerald-700"
          mutedColor="text-emerald-400"
          icon="🩺"
        />
        <StatCard
          label="Referrals"
          value={referrals}
          from="from-blue-50"
          to="to-blue-100"
          textColor="text-blue-700"
          mutedColor="text-blue-400"
          icon="🔀"
        />
        <StatCard
          label="Admissions"
          value={admissions}
          from="from-amber-50"
          to="to-amber-100"
          textColor="text-amber-700"
          mutedColor="text-amber-400"
          icon="🏥"
        />
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Today's consultations</h3>
        <Link
          to="/consultation/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          + New
        </Link>
      </div>

      {/* States */}
      {isLoading && (
        <div className="text-center py-16 text-5xl animate-pulse opacity-30">🩺</div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          Could not load consultations. Check your connection.
        </div>
      )}

      {!isLoading && !isError && consultations.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="text-6xl opacity-20">🩺</div>
          <p className="text-sm text-gray-400">No consultations recorded yet today.</p>
          <Link
            to="/consultation/new"
            className="inline-block bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Record first consultation
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {consultations.map(c => <ConsultationRow key={c.id} c={c} />)}
      </div>

    </div>
  )
}
