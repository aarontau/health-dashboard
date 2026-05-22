import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { format } from 'date-fns'
import { fetchDistrictDashboard } from '../api/dashboard'
import { useAuthStore } from '../store/auth'
import StatCard from '../components/StatCard'
import Layout from '../components/Layout'

const COLORS = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe','#eff6ff','#f0f9ff','#e0f2fe','#bae6fd']

export default function DistrictPage() {
  const user = useAuthStore(s => s.user)
  const [districtId, setDistrictId] = useState<number>(user?.district_id ?? 0)
  const [inputVal, setInputVal] = useState(String(user?.district_id ?? ''))

  const { data = [], isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['district', districtId],
    queryFn: () => fetchDistrictDashboard(districtId),
    enabled: districtId > 0,
    refetchInterval: 5 * 60 * 1000,
  })

  const totalCases       = useMemo(() => data.reduce((s, r) => s + r.case_count, 0), [data])
  const topDiagnosis     = useMemo(() => data[0]?.diagnosis_description ?? '—', [data])
  const districtName     = data[0]?.district_name ?? `District ${districtId}`

  const chartData = useMemo(
    () => data.slice(0, 10).map(r => ({ name: r.icd10_code, cases: r.case_count, label: r.diagnosis_description })),
    [data]
  )

  const canOverride = user && ['provincial_officer','national_officer','minister'].includes(user.role)

  function applyOverride(e: React.FormEvent) {
    e.preventDefault()
    const id = parseInt(inputVal)
    if (id > 0) setDistrictId(id)
  }

  return (
    <Layout title="District Dashboard">
      <div className="space-y-6 max-w-6xl">

        {/* District selector for higher roles */}
        {canOverride && (
          <form onSubmit={applyOverride} className="flex items-center gap-2">
            <label className="text-sm text-slate-600 shrink-0">District ID:</label>
            <input
              type="number" min={1} value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
              Load
            </button>
          </form>
        )}

        {/* Context */}
        <div>
          <h2 className="text-xl font-bold text-slate-900">{districtName}</h2>
          <p className="text-sm text-slate-500">Disease burden — last 7 days
            {dataUpdatedAt > 0 && ` · Updated ${format(dataUpdatedAt, 'HH:mm')}`}
          </p>
        </div>

        {isLoading && <div className="text-slate-400 py-12 text-center">Loading…</div>}

        {isError && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
            Could not load district data. Check that the district ID is correct and you have access.
          </div>
        )}

        {!isLoading && data.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Total cases (7 days)" value={totalCases.toLocaleString()} icon="📊" accent="text-blue-600" />
              <StatCard label="Distinct conditions"  value={data.length}                  icon="🧬" />
              <StatCard label="Most prevalent"        value={topDiagnosis}                 icon="⚠️" sub={data[0]?.icd10_code} />
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Top 10 diagnoses by case count</h3>
              <p className="text-xs text-slate-400 mb-4">ICD-10 code on axis — hover for full description</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs max-w-xs">
                          <p className="font-semibold text-slate-900">{d.name}</p>
                          <p className="text-slate-500 mt-0.5">{d.label}</p>
                          <p className="text-blue-600 font-bold mt-1">{d.cases} cases</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="cases" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Full table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">All diagnoses — 7-day burden</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ICD-10</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cases</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">First seen</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map(row => (
                      <tr key={row.icd10_code} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-mono text-blue-600 font-medium">{row.icd10_code}</td>
                        <td className="px-6 py-3 text-slate-700">{row.diagnosis_description}</td>
                        <td className="px-6 py-3 text-right font-semibold text-slate-900">{row.case_count}</td>
                        <td className="px-6 py-3 text-slate-500">{format(new Date(row.first_seen), 'd MMM yyyy')}</td>
                        <td className="px-6 py-3 text-slate-500">{format(new Date(row.last_seen), 'd MMM yyyy')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!isLoading && districtId === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-3xl mb-2">🏥</p>
            <p>Enter a district ID above to load data.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
