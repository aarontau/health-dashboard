import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, format } from 'date-fns'
import { useAuthStore } from '../store/auth'
import { fetchOutgoingReferrals, fetchIncomingReferrals, updateReferralStatus } from '../api/referrals'
import type { Referral, ReferralPriority, ReferralStatus } from '../types'

const PRIORITY_STYLE: Record<ReferralPriority, { label: string; cls: string }> = {
  routine:   { label: 'Routine',   cls: 'bg-blue-100 text-blue-800'     },
  urgent:    { label: 'Urgent',    cls: 'bg-orange-100 text-orange-800'  },
  emergency: { label: 'Emergency', cls: 'bg-red-100 text-red-800'       },
}

const STATUS_STYLE: Record<ReferralStatus, { label: string; cls: string }> = {
  pending:   { label: 'Pending',   cls: 'bg-yellow-100 text-yellow-800' },
  accepted:  { label: 'Accepted',  cls: 'bg-green-100 text-green-800'   },
  rejected:  { label: 'Rejected',  cls: 'bg-red-100 text-red-800'       },
  completed: { label: 'Completed', cls: 'bg-gray-100 text-gray-600'     },
}

function ReferralCard({
  referral,
  showActions,
  onStatusChange,
  isUpdating,
}: {
  referral: Referral
  showActions: boolean
  onStatusChange: (id: number, status: string) => void
  isUpdating: boolean
}) {
  const priority = PRIORITY_STYLE[referral.priority]
  const statusStyle = STATUS_STYLE[referral.status]

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${priority.cls}`}>
            {priority.label}
          </span>
          <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${statusStyle.cls}`}>
            {statusStyle.label}
          </span>
        </div>
        <Link
          to={`/consultation/${referral.consultation_id}`}
          className="shrink-0 text-xs text-brand-600 hover:text-brand-800"
        >
          Consult #{referral.consultation_id}
        </Link>
      </div>

      <p className="text-sm text-gray-900">{referral.reason}</p>
      {referral.clinical_summary && (
        <p className="text-xs text-gray-500 italic">{referral.clinical_summary}</p>
      )}

      <div className="text-xs text-gray-400 flex items-center gap-3">
        <span>Facility #{referral.receiving_facility_id}</span>
        <span>·</span>
        <span title={format(new Date(referral.referred_at), 'd MMM yyyy, HH:mm')}>
          {formatDistanceToNow(new Date(referral.referred_at), { addSuffix: true })}
        </span>
      </div>

      {showActions && referral.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onStatusChange(referral.id, 'accepted')}
            disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onStatusChange(referral.id, 'rejected')}
            disabled={isUpdating}
            className="flex-1 bg-white hover:bg-red-50 disabled:opacity-50 border border-red-300 text-red-600 text-sm font-medium rounded-lg py-2 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {showActions && referral.status === 'accepted' && (
        <button
          onClick={() => onStatusChange(referral.id, 'completed')}
          disabled={isUpdating}
          className="w-full bg-white hover:bg-gray-50 disabled:opacity-50 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg py-2 transition-colors"
        >
          Mark complete
        </button>
      )}
    </div>
  )
}

export default function ReferralsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isManager = user?.role === 'facility_manager'
  const [tab, setTab] = useState<'outgoing' | 'incoming'>(isManager ? 'incoming' : 'outgoing')

  const outgoing = useQuery({
    queryKey: ['referrals', 'outgoing'],
    queryFn: fetchOutgoingReferrals,
    staleTime: 30_000,
  })

  const incoming = useQuery({
    queryKey: ['referrals', 'incoming'],
    queryFn: fetchIncomingReferrals,
    enabled: isManager,
    staleTime: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateReferralStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', 'incoming'] })
    },
  })

  const activeQuery = tab === 'outgoing' ? outgoing : incoming
  const referrals: Referral[] = activeQuery.data ?? []

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Referrals</h2>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('outgoing')}
          className={`flex-1 text-sm font-medium rounded-lg py-2 transition-colors ${
            tab === 'outgoing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sent
        </button>
        <button
          onClick={() => setTab('incoming')}
          disabled={!isManager}
          className={`flex-1 text-sm font-medium rounded-lg py-2 transition-colors ${
            tab === 'incoming'
              ? 'bg-white text-gray-900 shadow-sm'
              : isManager
              ? 'text-gray-500 hover:text-gray-700'
              : 'text-gray-300 cursor-not-allowed'
          }`}
        >
          Incoming
          {!isManager && <span className="ml-1 text-xs">(manager only)</span>}
        </button>
      </div>

      {/* List */}
      {activeQuery.isLoading && (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      )}

      {activeQuery.isError && (
        <div className="text-center py-12 text-red-500">Could not load referrals.</div>
      )}

      {!activeQuery.isLoading && !activeQuery.isError && referrals.length === 0 && (
        <div className="text-center py-12 text-gray-400">No referrals to show.</div>
      )}

      {referrals.map(ref => (
        <ReferralCard
          key={ref.id}
          referral={ref}
          showActions={tab === 'incoming' && isManager}
          onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
          isUpdating={statusMutation.isPending}
        />
      ))}
    </div>
  )
}
