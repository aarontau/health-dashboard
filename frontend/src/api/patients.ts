import client from './client'
import type { Patient, PatientCreate } from '../types'

export async function createOrFindPatient(body: PatientCreate): Promise<Patient> {
  const { data } = await client.post<Patient>('/patients/', body)
  return data
}

export async function fetchPatient(id: number): Promise<Patient> {
  const { data } = await client.get<Patient>(`/patients/${id}`)
  return data
}
