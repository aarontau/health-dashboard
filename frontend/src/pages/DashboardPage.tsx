import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fetchConsultations } from '../api/consultations'
import { useAuthStore } from '../store/auth'
import type { Consultation, ConsultationOutcome } from '../types'

const OUTCOME_STYLE: Record<ConsultationOutcome, { label: string; cls: string }> = {
  treated_and_discharged: { label: 'Discharged',  cls: 'bg-green-100 text-green-800'  },
  referred:               { label: 'Referred',    cls: 'bg-blue-100 text-blue-800'    },
  admitted:               { label: 'Admitted',    cls: 'bg-orange-100 text-orange-800' },
  follow_up_scheduled:    { label: 'Follow-up',   cls: 'bg-yellow-100 text-yellow-800' },
  left_without_being_seen:{ label: 'LWBS',        cls: 'bg-gray-100 text-gray-600'    },
  deceased:               { label: 'Deceased',    cls: 'bg-red-100 text-red-800'      },
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function ConsultationRow({ c }: { c: Consultation }) {
  const style = OUTCOME_STYLE[c.outcome]
  const time = format(new Date(c.started_at), 'HH:mm')
  return (
    <Link
      to={`/consultation/${c.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
    >
      <div className="text-sm text-gray-400 font-mono w-12 shrink-0">{time}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">Patient #{c.patient_id}</p>
        <p className="text-xs text-gray-500 truncate mt-0.5">{c.chief_complaint}</p>
      </div>
      <span className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-1 ${style.cls}`}>
        {style.label}
      </span>
    </Link>
  )
}

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: consultations = [], isLoading, isError } = useQuery({
    queryKey: ['consultations', today],
    queryFn: () => fetchConsultations(today),
    refetchInterval: 30_000,
  })

  const referrals  = consultations.filter(c => c.outcome === 'referred').length
  const admissions = consultations.filter(c => c.outcome === 'admitted').length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Good {greeting()}, {user?.first_name}</h2>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Consultations" value={consultations.length} color="text-brand-600" />
        <StatCard label="Referrals"     value={referrals}            color="text-blue-600"  />
        <StatCard label="Admissions"    value={admissions}           color="text-orange-600" />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Today's consultations</h3>
        <Link
          to="/consultation/new"
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      )}

      {isError && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
          Could not load consultations. Check your connection.
        </div>
      )}

      {!isLoading && consultations.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">No consultations recorded yet today.</p>
          <Link to="/consultation/new" className="text-brand-600 text-sm font-medium mt-2 inline-block">
            Start the first one →
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {consultations.map(c => <ConsultationRow key={c.id} c={c} />)}
      </div>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
