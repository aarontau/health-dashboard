import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { createOrFindPatient } from '../api/patients'
import { createConsultation } from '../api/consultations'
import { searchICD10 } from '../data/icd10Common'
import type {
  ConsultationOutcome, DiagnosisCreate, PrescriptionCreate, Sex,
} from '../types'

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z.object({
  chief_complaint:      z.string().min(1, 'Required'),
  clinical_notes:       z.string().optional(),
  outcome:              z.enum(['treated_and_discharged','referred','admitted','follow_up_scheduled','left_without_being_seen','deceased'] as const),
  follow_up_date:       z.string().optional(),
  systolic_bp:          z.coerce.number().min(40).max(300).optional().or(z.literal('')),
  diastolic_bp:         z.coerce.number().min(20).max(200).optional().or(z.literal('')),
  heart_rate:           z.coerce.number().min(20).max(300).optional().or(z.literal('')),
  temperature_celsius:  z.coerce.number().min(25).max(45).optional().or(z.literal('')),
  oxygen_saturation:    z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  weight_kg:            z.coerce.number().min(0).max(500).optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

// ---------------------------------------------------------------------------
// Outcome buttons
// ---------------------------------------------------------------------------

const OUTCOMES: { value: ConsultationOutcome; label: string; color: string }[] = [
  { value: 'treated_and_discharged',  label: 'Discharged',  color: 'bg-green-100  border-green-400  text-green-800'  },
  { value: 'referred',                label: 'Referred',    color: 'bg-blue-100   border-blue-400   text-blue-800'   },
  { value: 'admitted',                label: 'Admitted',    color: 'bg-orange-100 border-orange-400 text-orange-800' },
  { value: 'follow_up_scheduled',     label: 'Follow-up',   color: 'bg-yellow-100 border-yellow-400 text-yellow-800' },
  { value: 'left_without_being_seen', label: 'LWBS',        color: 'bg-gray-100   border-gray-400   text-gray-700'   },
  { value: 'deceased',                label: 'Deceased',    color: 'bg-red-100    border-red-400    text-red-800'    },
]

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const INPUT = 'w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewConsultationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Patient step state
  const [step, setStep] = useState<'patient' | 'consult'>('patient')
  const [patientId, setPatientId] = useState<number | null>(null)
  const [isNewPatient, setIsNewPatient] = useState(false)

  const [nationalId, setNationalId] = useState('')
  const [sex, setSex] = useState<Sex>('unknown')
  const [yearOfBirth, setYearOfBirth] = useState('')
  const [patientError, setPatientError] = useState('')
  const [patientLoading, setPatientLoading] = useState(false)

  // Diagnoses state
  const [dxQuery, setDxQuery] = useState('')
  const [selectedDx, setSelectedDx] = useState<DiagnosisCreate[]>([])
  const dxResults = useMemo(() => searchICD10(dxQuery), [dxQuery])

  // Prescriptions state
  const [rxList, setRxList] = useState<PrescriptionCreate[]>([])
  const [rxMed, setRxMed] = useState('')
  const [rxDose, setRxDose] = useState('')
  const [rxFreq, setRxFreq] = useState('')
  const [rxDays, setRxDays] = useState('')

  // Vitals collapse
  const [vitalsOpen, setVitalsOpen] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { outcome: 'treated_and_discharged' },
  })

  const outcome = watch('outcome')

  // ---------------------------------------------------------------------------
  // Patient step
  // ---------------------------------------------------------------------------

  async function handlePatientSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPatientError('')
    setPatientLoading(true)
    try {
      const patient = await createOrFindPatient({
        national_id: nationalId || undefined,
        sex,
        year_of_birth: yearOfBirth ? parseInt(yearOfBirth) : undefined,
      })
      setPatientId(patient.id)
      setIsNewPatient(!patient.created_at || Date.now() - new Date(patient.created_at).getTime() < 10_000)
      setStep('consult')
    } catch {
      setPatientError('Could not register patient. Please check your connection and try again.')
    } finally {
      setPatientLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Diagnosis helpers
  // ---------------------------------------------------------------------------

  function addDx(code: string, description: string) {
    if (selectedDx.some(d => d.icd10_code === code)) return
    setSelectedDx(prev => [...prev, { icd10_code: code, is_primary: prev.length === 0, confirmed: false }])
    setDxQuery('')
  }

  function removeDx(code: string) {
    setSelectedDx(prev => {
      const next = prev.filter(d => d.icd10_code !== code)
      if (next.length > 0 && !next.some(d => d.is_primary)) next[0].is_primary = true
      return next
    })
  }

  function setPrimary(code: string) {
    setSelectedDx(prev => prev.map(d => ({ ...d, is_primary: d.icd10_code === code })))
  }

  // ---------------------------------------------------------------------------
  // Prescription helpers
  // ---------------------------------------------------------------------------

  function addRx() {
    if (!rxMed.trim()) return
    setRxList(prev => [...prev, { medicine_name: rxMed.trim(), dose: rxDose || undefined, frequency: rxFreq || undefined, duration_days: rxDays ? parseInt(rxDays) : undefined }])
    setRxMed(''); setRxDose(''); setRxFreq(''); setRxDays('')
  }

  // ---------------------------------------------------------------------------
  // Consultation submit
  // ---------------------------------------------------------------------------

  const mutation = useMutation({
    mutationFn: createConsultation,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] })
      navigate(`/consultation/${data.id}`)
    },
  })

  function onSubmit(values: FormValues) {
    if (!patientId) return
    mutation.mutate({
      patient_id: patientId,
      is_new_patient: isNewPatient,
      chief_complaint: values.chief_complaint,
      clinical_notes: values.clinical_notes || undefined,
      outcome: values.outcome,
      follow_up_date: values.follow_up_date || undefined,
      systolic_bp:         values.systolic_bp         ? Number(values.systolic_bp)         : undefined,
      diastolic_bp:        values.diastolic_bp        ? Number(values.diastolic_bp)        : undefined,
      heart_rate:          values.heart_rate          ? Number(values.heart_rate)          : undefined,
      temperature_celsius: values.temperature_celsius ? Number(values.temperature_celsius) : undefined,
      oxygen_saturation:   values.oxygen_saturation   ? Number(values.oxygen_saturation)   : undefined,
      weight_kg:           values.weight_kg           ? Number(values.weight_kg)           : undefined,
      diagnoses: selectedDx,
      prescriptions: rxList,
    })
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">New Consultation</h2>

      {/* ---- STEP 1: Patient ---- */}
      {step === 'patient' && (
        <form onSubmit={handlePatientSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Patient identification</h3>

            <div>
              <label className={LABEL}>ID / Passport number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={nationalId}
                onChange={e => setNationalId(e.target.value)}
                className={INPUT}
                placeholder="Leave blank if patient has no document"
              />
              <p className="text-xs text-gray-400 mt-1">The number is hashed immediately and never stored in plain text.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Sex <span className="text-red-500">*</span></label>
                <select value={sex} onChange={e => setSex(e.target.value as Sex)} className={INPUT} required>
                  <option value="unknown">Unknown</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="intersex">Intersex</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Year of birth</label>
                <input
                  type="number"
                  value={yearOfBirth}
                  onChange={e => setYearOfBirth(e.target.value)}
                  className={INPUT}
                  placeholder={`e.g. ${new Date().getFullYear() - 30}`}
                  min={1900}
                  max={new Date().getFullYear()}
                />
              </div>
            </div>

            {patientError && (
              <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{patientError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={patientLoading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg py-3.5 text-base transition-colors"
          >
            {patientLoading ? 'Registering patient…' : 'Continue →'}
          </button>
        </form>
      )}

      {/* ---- STEP 2: Consultation form ---- */}
      {step === 'consult' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Patient confirmed badge */}
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span>✓</span>
            <span>Patient #{patientId} registered</span>
            <button type="button" onClick={() => setStep('patient')} className="ml-auto text-gray-400 text-xs hover:text-gray-600">Change</button>
          </div>

          {/* Chief complaint */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800">Presenting complaint</h3>
            <div>
              <label className={LABEL}>Chief complaint <span className="text-red-500">*</span></label>
              <textarea
                {...register('chief_complaint')}
                rows={3}
                className={INPUT}
                placeholder="Describe the main reason for the visit…"
              />
              {errors.chief_complaint && <p className="text-red-500 text-xs mt-1">{errors.chief_complaint.message}</p>}
            </div>
            <div>
              <label className={LABEL}>Clinical notes <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea {...register('clinical_notes')} rows={2} className={INPUT} placeholder="Examination findings, history, other notes…" />
            </div>
          </div>

          {/* Outcome */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3">Outcome <span className="text-red-500">*</span></h3>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setValue('outcome', o.value)}
                  className={`border-2 rounded-lg py-3 text-sm font-medium transition-all ${
                    outcome === o.value ? o.color + ' border-current' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {outcome === 'follow_up_scheduled' && (
              <div className="mt-4">
                <label className={LABEL}>Follow-up date</label>
                <input type="date" {...register('follow_up_date')} className={INPUT} min={format(new Date(), 'yyyy-MM-dd')} />
              </div>
            )}
          </div>

          {/* Vitals — collapsible */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <button
              type="button"
              onClick={() => setVitalsOpen(v => !v)}
              className="flex items-center justify-between w-full"
            >
              <h3 className="font-semibold text-gray-800">Vitals <span className="text-gray-400 font-normal text-sm">(optional)</span></h3>
              <span className="text-gray-400 text-sm">{vitalsOpen ? '▲' : '▼'}</span>
            </button>

            {vitalsOpen && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Systolic BP</label>
                  <input type="number" {...register('systolic_bp')} className={INPUT} placeholder="mmHg" />
                </div>
                <div>
                  <label className={LABEL}>Diastolic BP</label>
                  <input type="number" {...register('diastolic_bp')} className={INPUT} placeholder="mmHg" />
                </div>
                <div>
                  <label className={LABEL}>Heart rate</label>
                  <input type="number" {...register('heart_rate')} className={INPUT} placeholder="bpm" />
                </div>
                <div>
                  <label className={LABEL}>Temperature</label>
                  <input type="number" step="0.1" {...register('temperature_celsius')} className={INPUT} placeholder="°C" />
                </div>
                <div>
                  <label className={LABEL}>O₂ saturation</label>
                  <input type="number" {...register('oxygen_saturation')} className={INPUT} placeholder="%" />
                </div>
                <div>
                  <label className={LABEL}>Weight</label>
                  <input type="number" step="0.1" {...register('weight_kg')} className={INPUT} placeholder="kg" />
                </div>
              </div>
            )}
          </div>

          {/* Diagnoses */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800">Diagnoses (ICD-10)</h3>
            <div className="relative">
              <input
                type="text"
                value={dxQuery}
                onChange={e => setDxQuery(e.target.value)}
                className={INPUT}
                placeholder="Search by code or description…"
              />
              {dxResults.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {dxResults.map(r => (
                    <li key={r.code}>
                      <button
                        type="button"
                        onClick={() => addDx(r.code, r.description)}
                        className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors"
                      >
                        <span className="font-mono text-xs text-brand-600 mr-2">{r.code}</span>
                        <span className="text-sm text-gray-700">{r.description}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedDx.length > 0 && (
              <ul className="space-y-2">
                {selectedDx.map(d => (
                  <li key={d.icd10_code} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-mono text-xs text-brand-600">{d.icd10_code}</span>
                    <button
                      type="button"
                      onClick={() => setPrimary(d.icd10_code)}
                      className={`text-xs rounded-full px-2 py-0.5 ${d.is_primary ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {d.is_primary ? 'Primary' : 'Secondary'}
                    </button>
                    <button type="button" onClick={() => removeDx(d.icd10_code)} className="ml-auto text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Prescriptions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800">Prescriptions</h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input value={rxMed} onChange={e => setRxMed(e.target.value)} className={INPUT} placeholder="Medicine name" />
              </div>
              <input value={rxDose}  onChange={e => setRxDose(e.target.value)}  className={INPUT} placeholder="Dose (e.g. 500mg)" />
              <input value={rxFreq}  onChange={e => setRxFreq(e.target.value)}  className={INPUT} placeholder="Frequency (e.g. 8-hourly)" />
              <div className="col-span-2 flex gap-2">
                <input value={rxDays} onChange={e => setRxDays(e.target.value)} type="number" className={INPUT} placeholder="Duration (days)" />
                <button
                  type="button"
                  onClick={addRx}
                  disabled={!rxMed.trim()}
                  className="shrink-0 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg px-4 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {rxList.length > 0 && (
              <ul className="divide-y divide-gray-100">
                {rxList.map((rx, i) => (
                  <li key={i} className="flex items-center gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{rx.medicine_name}</p>
                      <p className="text-xs text-gray-500">{[rx.dose, rx.frequency, rx.duration_days && `${rx.duration_days} days`].filter(Boolean).join(' · ')}</p>
                    </div>
                    <button type="button" onClick={() => setRxList(l => l.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {mutation.isError && (
            <p className="text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
              Could not save the consultation. Please try again.
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold rounded-lg py-4 text-base transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Save consultation'}
          </button>
        </form>
      )}
    </div>
  )
}
