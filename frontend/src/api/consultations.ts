import client from './client'
import type { Consultation, ConsultationCreate } from '../types'

export async function fetchConsultations(date?: string): Promise<Consultation[]> {
  const params = date ? { consultation_date: date } : {}
  const { data } = await client.get<Consultation[]>('/consultations/', { params })
  return data
}

export async function fetchConsultation(id: number): Promise<Consultation> {
  const { data } = await client.get<Consultation>(`/consultations/${id}`)
  return data
}

export async function createConsultation(body: ConsultationCreate): Promise<Consultation> {
  const { data } = await client.post<Consultation>('/consultations/', body)
  return data
}
