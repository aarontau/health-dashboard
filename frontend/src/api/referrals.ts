import client from './client'
import type { Referral, ReferralCreate } from '../types'

export async function fetchOutgoingReferrals(): Promise<Referral[]> {
  const { data } = await client.get<Referral[]>('/referrals/outgoing')
  return data
}

export async function fetchIncomingReferrals(): Promise<Referral[]> {
  const { data } = await client.get<Referral[]>('/referrals/incoming')
  return data
}

export async function fetchReferral(id: number): Promise<Referral> {
  const { data } = await client.get<Referral>(`/referrals/${id}`)
  return data
}

export async function createReferral(consultationId: number, body: ReferralCreate): Promise<Referral> {
  const { data } = await client.post<Referral>(`/consultations/${consultationId}/referrals`, body)
  return data
}

export async function updateReferralStatus(id: number, status: string): Promise<Referral> {
  const { data } = await client.patch<Referral>(`/referrals/${id}/status`, { status })
  return data
}
