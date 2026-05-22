import client from './client'
import type {
  DiseaseBurdenRow, FacilityDailySummaryRow, FacilityLoadRow, ProvinceSummaryRow,
} from '../types'

export async function fetchFacilityDashboard(): Promise<FacilityDailySummaryRow[]> {
  const { data } = await client.get('/dashboard/facility')
  return data
}

export async function fetchDistrictDashboard(districtId: number): Promise<DiseaseBurdenRow[]> {
  const { data } = await client.get(`/dashboard/district/${districtId}`)
  return data
}

export async function fetchProvinceDashboard(provinceId: number): Promise<FacilityLoadRow[]> {
  const { data } = await client.get(`/dashboard/province/${provinceId}`)
  return data
}

export async function fetchNationalDashboard(): Promise<ProvinceSummaryRow[]> {
  const { data } = await client.get('/dashboard/national')
  return data
}
