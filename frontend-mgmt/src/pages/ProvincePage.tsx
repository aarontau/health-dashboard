import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { format } from 'date-fns'
import { fetchProvinceDashboard } from '../api/dashboard'
import { useAuthStore } from '../store/auth'
import StatCard from '../components/StatCard'
import Layout from '../components/Layout'
import type { FacilityLoadRow } from '../types'

function latestMonth(rows: FacilityLoadRow[]): string {
  return rows.reduce((max, r) => (r.month > max ? r.month : max), '')
}

export default function ProvincePage() {
  const user = useAuthStore(s => s.user)
  const [provinceId, setProvinceId] = useState<number>(user?.province_id ?? 0)
  const [inputVal, setInputVal]     = useState(String(user?.province_id ?? ''))

  const { data = [], isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['province', provinceId],
    queryFn: () => fetchProvinceDashboard(provinceId),
    enabled: provinceId > 0,
    refetchInterval: 5 * 60 * 1000,
  })

  const latest = useMemo(() => latestMonth(data), [data])
  const latestRows = useMemo(() => data.filter(r => r.month === latest), [data, latest])
  const provinceName = data[0]?.province_name ?? `Province ${provinceId}`

  // Stats for latest month
  const totalConsults = useMemo(() => latestRows.reduce((s, r) => s + r.consultations, 0), [latestRows])
  const totalReferrals = useMemo(() => latestRows.reduce((s, r) => s + r.referrals, 0), [latestRows])
  const referralRate   = totalConsults > 0 ? ((totalReferrals / totalConsults) * 100).toFixed(1) : '0'

  // Facility bar chart — latest month top 15 by consultations
  const facilityChart = useMemo(
    () => [...latestRows]
      .sort((a, b) => b.consultations - a.consultations)
      .slice(0, 15)
      .map(r => ({ name: r.facility_name.length > 20 ? r.facility_name.slice(0, 18) + '…' : r.facility_name, consultations: r.consultations, referrals: r.referrals, fullName: r.facility_name })),
    [latestRows]
  )

  // Monthly trend — aggregate across all facilities
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { consultations: number; referrals: number }>()
    data.forEach(r => {
      const existing = map.get(r.month) ?? { consultations: 0, referrals: 0 }
      map.set(r.month, { consultations: existing.consultations + r.consultations, referrals: existing.referrals + r.referrals })
    })
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => ({
        month: format(new Date(month), 'MMM yy'),
        consultations: d.consultations,
        referrals: d.referrals,
      }))
  }, [data])

  const canOverride = user && ['national_officer', 'minister'].includes(user.role)

  function applyOverride(e: React.FormEvent) {
    e.preventDefault()
    const id = parseInt(inputVal)
    if (id > 0) setProvinceId(id)
  }

  return (
    <Layout title="Province Dashboard">
      <div className="space-y-6 max-w-6xl">

        {canOverride && (
          <form onSubmit={applyOverride} className="flex items-center gap-2">
            <label className="text-sm text-slate-600 shrink-0">Province ID:</label>
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

        <div>
          <h2 className="text-xl font-bold text-slate-900">{provinceName}</h2>
          <p className="text-sm text-slate-500">
            Facility load — {latest ? format(new Date(latest), 'MMMM yyyy') : '—'}
            {dataUpdatedAt > 0 && ` · Updated ${format(dataUpdatedAt, 'HH:mm')}`}
          </p>
        </div>

        {isLoading && <div className="text-slate-400 py-12 text-center">Loading…</div>}
        {isError && <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">Could not load province data.</div>}

        {!isLoading && data.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <StatCard label="Consultations (this month)" value={totalConsults.toLocaleString()} icon="📋" accent="text-blue-600" />
              <StatCard label="Active facilities"           value={latestRows.length}              icon="🏥" />
              <StatCard label="Referrals out"               value={totalReferrals.toLocaleString()} icon="🔀" accent="text-orange-500" />
              <StatCard label="Referral rate"               value={`${referralRate}%`}             icon="📈" accent={parseFloat(referralRate) > 15 ? 'text-red-600' : 'text-green-600'} />
            </div>

            {/* Facility bar chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-1">Consultations by facility — {latest ? format(new Date(latest), 'MMMM yyyy') : ''}</h3>
              <p className="text-xs text-slate-400 mb-4">Top 15 facilities by volume</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={facilityChart} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs">
                          <p className="font-semibold text-slate-900">{d.fullName}</p>
                          <p className="text-blue-600 mt-1">Consultations: <strong>{d.consultations}</strong></p>
                          <p className="text-orange-500">Referrals: <strong>{d.referrals}</strong></p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="consultations" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly trend */}
            {monthlyTrend.length > 1 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly trend — province total</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyTrend} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={48} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="consultations" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} name="Consultations" />
                    <Line type="monotone" dataKey="referrals"     stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} name="Referrals" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Facility detail table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700">All facilities — {latest ? format(new Date(latest), 'MMMM yyyy') : ''}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Facility</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">District</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Consultations</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Patients</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Referrals</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Ref %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...latestRows]
                      .sort((a, b) => b.consultations - a.consultations)
                      .map(row => {
                        const rate = row.consultations > 0 ? ((row.referrals / row.consultations) * 100).toFixed(1) : '0'
                        return (
                          <tr key={row.facility_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 font-medium text-slate-900">{row.facility_name}</td>
                            <td className="px-6 py-3 text-slate-500">{row.district_name}</td>
                            <td className="px-6 py-3 text-slate-500 capitalize">{row.facility_type.replace(/_/g, ' ')}</td>
                            <td className="px-6 py-3 text-right font-semibold text-slate-900">{row.consultations.toLocaleString()}</td>
                            <td className="px-6 py-3 text-right text-slate-700">{row.unique_patients.toLocaleString()}</td>
                            <td className="px-6 py-3 text-right text-orange-600 font-medium">{row.referrals.toLocaleString()}</td>
                            <td className="px-6 py-3 text-right">
                              <span className={`font-medium ${parseFloat(rate) > 15 ? 'text-red-600' : 'text-green-600'}`}>{rate}%</span>
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
