import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { fetchNationalDashboard } from '../api/dashboard'
import StatCard from '../components/StatCard'
import Layout from '../components/Layout'
import type { ProvinceSummaryRow } from '../types'

function latestMonth(rows: ProvinceSummaryRow[]): string {
  return rows.reduce((max, r) => (r.month > max ? r.month : max), '')
}

export default function NationalPage() {
  const { data = [], isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['national'],
    queryFn: fetchNationalDashboard,
    refetchInterval: 5 * 60 * 1000,
  })

  const latest     = useMemo(() => latestMonth(data), [data])
  const latestRows = useMemo(() => data.filter(r => r.month === latest), [data, latest])

  // Headline stats
  const totalConsults   = useMemo(() => latestRows.reduce((s, r) => s + r.total_consultations, 0), [latestRows])
  const totalPatients   = useMemo(() => latestRows.reduce((s, r) => s + r.unique_patients, 0), [latestRows])
  const totalFacilities = useMemo(() => latestRows.reduce((s, r) => s + r.active_facilities, 0), [latestRows])
  const avgRefRate      = useMemo(() => {
    if (!latestRows.length) return 0
    return latestRows.reduce((s, r) => s + r.referral_rate_pct, 0) / latestRows.length
  }, [latestRows])

  // Province bar chart
  const provinceChart = useMemo(
    () => [...latestRows]
      .sort((a, b) => b.total_consultations - a.total_consultations)
      .map(r => ({ name: r.province_name, consultations: r.total_consultations, refRate: Number(r.referral_rate_pct) })),
    [latestRows]
  )

  // National monthly trend
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { consultations: number; patients: number }>()
    data.forEach(r => {
      const ex = map.get(r.month) ?? { consultations: 0, patients: 0 }
      map.set(r.month, { consultations: ex.consultations + r.total_consultations, patients: ex.patients + r.unique_patients })
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({ month: format(new Date(month), 'MMM yy'), ...d }))
  }, [data])

  // Referral rate heat — highest provinces on top
  const refRateRanking = useMemo(
    () => [...latestRows].sort((a, b) => b.referral_rate_pct - a.referral_rate_pct),
    [latestRows]
  )

  return (
    <Layout title="National Overview">
      <div className="space-y-6 max-w-6xl">

        <div>
          <h2 className="text-xl font-bold text-slate-900">Republic of South Africa</h2>
          <p className="text-sm text-slate-500">
            All provinces — {latest ? format(new Date(latest), 'MMMM yyyy') : 'Loading…'}
            {dataUpdatedAt > 0 && ` · Updated ${format(dataUpdatedAt, 'HH:mm')}`}
          </p>
        </div>

        {isLoading && <div className="text-slate-400 py-12 text-center">Loading national data…</div>}
        {isError && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">Could not load national data.</div>}

        {!isLoading && data.length > 0 && (
          <>
            {/* Headline stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Consultations"    value={totalConsults.toLocaleString()}   icon="📋" accent="text-blue-600" sub={format(new Date(latest), 'MMMM yyyy')} />
              <StatCard label="Unique patients"  value={totalPatients.toLocaleString()}   icon="🧑‍⚕️" />
              <StatCard label="Active facilities" value={totalFacilities.toLocaleString()} icon="🏥" />
              <StatCard
                label="Avg referral rate"
                value={`${avgRefRate.toFixed(1)}%`}
                icon="🔀"
                accent={avgRefRate > 15 ? 'text-red-600' : 'text-green-600'}
                sub={avgRefRate > 15 ? 'Above 15% target' : 'Within target'}
              />
            </div>

            {/* Province bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Consultations by province</h3>
              <p className="text-xs text-slate-400 mb-4">{format(new Date(latest), 'MMMM yyyy')}</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={provinceChart} margin={{ top: 4, right: 16, left: 0, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={48} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs">
                          <p className="font-semibold text-slate-900">{d.name}</p>
                          <p className="text-blue-600 mt-1">Consultations: <strong>{d.consultations.toLocaleString()}</strong></p>
                          <p className="text-orange-500">Referral rate: <strong>{d.refRate.toFixed(1)}%</strong></p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="consultations" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly trend */}
            {monthlyTrend.length > 1 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">National monthly trend</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={52} />
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                    <Legend />
                    <Line type="monotone" dataKey="consultations" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Consultations" />
                    <Line type="monotone" dataKey="patients"      stroke="#10b981" strokeWidth={2}   dot={{ r: 3 }} name="Unique patients" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Province comparison table with referral rate heatmap */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Province comparison</h3>
                <span className="text-xs text-slate-400">Ranked by referral rate</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Province</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Consultations</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Unique patients</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Active facilities</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Referral rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {refRateRanking.map(row => {
                      const rate = Number(row.referral_rate_pct)
                      const rateColor = rate > 20 ? 'bg-red-100 text-red-700' : rate > 15 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      return (
                        <tr key={row.province_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-900">{row.province_name}</td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{row.total_consultations.toLocaleString()}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{row.unique_patients.toLocaleString()}</td>
                          <td className="px-6 py-3 text-right text-slate-700">{row.active_facilities}</td>
                          <td className="px-6 py-3 text-right">
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${rateColor}`}>
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
