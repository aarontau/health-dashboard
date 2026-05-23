import client from './client'
import type { Facility } from '../types'

export async function searchFacilities(name: string): Promise<Facility[]> {
  const { data } = await client.get<Facility[]>('/facilities', { params: { name, limit: 20 } })
  return data
}
