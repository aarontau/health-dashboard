import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { fetchConsultation } from '../api/consultations'
import type { ConsultationOutcome } from '../types'

const OUTCOME_STYLE: Record<ConsultationOutcome, { label: string; cls: string }> = {
  treated_and_discharged:  { label: 'Discharged',  cls: 'bg-green-100 text-green-800'   },
  referred:                { label: 'Referred',    cls: 'bg-blue-100 text-blue-800'     },
  admitted:                { label: 'Admitted',    cls: 'bg-orange-100 text-orange-800' },
  follow_up_scheduled:     { label: 'Follow-up',   cls: 'bg-yellow-100 text-yellow-800' },
  left_without_being_seen: { label: 'LWBS',        cls: 'bg-gray-100 text-gray-600'     },
  deceased:                { label: 'Deceased',    cls: 'bg-red-100 text-red-800'       },
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value}</p>
    </div>
  )
}

export default function ConsultationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['consultation', id],
    queryFn: () => fetchConsultation(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading…</div>
  if (isError || !data) return (
    <div className="text-center py-16">
      <p className="text-red-500">Could not load this consultation.</p>
      <Link to="/dashboard" className="text-brand-600 text-sm mt-2 inline-block">← Back to dashboard</Link>
    </div>
  )

  const style = OUTCOME_STYLE[data.outcome]
  const hasVitals = [data.systolic_bp, data.diastolic_bp, data.heart_rate, data.temperature_celsius, data.oxygen_saturation, data.weight_kg].some(v => v !== null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
          <h2 className="text-xl font-bold text-gray-900 mt-1">Consultation #{data.id}</h2>
          <p className="text-sm text-gray-500">
            Patient #{data.patient_id} · {format(new Date(data.started_at), 'HH:mm, d MMM yyyy')}
          </p>
        </div>
        <span className={`shrink-0 text-sm font-medium rounded-full px-3 py-1.5 ${style.cls}`}>{style.label}</span>
      </div>

      {/* Complaint & notes */}
      <SectionCard title="Presenting complaint">
        <p className="text-sm text-gray-900">{data.chief_complaint}</p>
        {data.clinical_notes && (
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{data.clinical_notes}</p>
        )}
      </SectionCard>

      {/* Follow-up */}
      {data.follow_up_date && (
        <SectionCard title="Follow-up">
          <p className="text-sm font-medium text-gray-900">{format(new Date(data.follow_up_date), 'd MMMM yyyy')}</p>
        </SectionCard>
      )}

      {/* Vitals */}
      {hasVitals && (
        <SectionCard title="Vitals">
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            {data.systolic_bp !== null && data.diastolic_bp !== null && (
              <Field label="Blood pressure" value={`${data.systolic_bp}/${data.diastolic_bp} mmHg`} />
            )}
            <Field label="Heart rate"   value={data.heart_rate   !== null ? `${data.heart_rate} bpm`  : null} />
            <Field label="Temperature"  value={data.temperature_celsius !== null ? `${data.temperature_celsius} °C` : null} />
            <Field label="O₂ saturation" value={data.oxygen_saturation !== null ? `${data.oxygen_saturation}%`    : null} />
            <Field label="Weight"       value={data.weight_kg    !== null ? `${data.weight_kg} kg`   : null} />
          </div>
        </SectionCard>
      )}

      {/* Diagnoses */}
      {data.diagnoses.length > 0 && (
        <SectionCard title="Diagnoses">
          <ul className="space-y-2">
            {data.diagnoses.map(d => (
              <li key={d.id} className="flex items-center gap-2">
                <span className="font-mono text-xs text-brand-600">{d.icd10_code}</span>
                {d.is_primary && (
                  <span className="text-xs bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">Primary</span>
                )}
                {d.confirmed && (
                  <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">Confirmed</span>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Prescriptions */}
      {data.prescriptions.length > 0 && (
        <SectionCard title="Prescriptions">
          <ul className="divide-y divide-gray-100">
            {data.prescriptions.map(rx => (
              <li key={rx.id} className="py-2 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-gray-900">{rx.medicine_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[rx.dose, rx.frequency, rx.duration_days ? `${rx.duration_days} days` : null].filter(Boolean).join(' · ')}
                </p>
                {rx.instructions && <p className="text-xs text-gray-400 mt-0.5 italic">{rx.instructions}</p>}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Metadata */}
      <div className="text-xs text-gray-400 text-center pb-2">
        Recorded at {format(new Date(data.created_at), 'HH:mm')} · Clinician #{data.clinician_id}
      </div>
    </div>
  )
}
