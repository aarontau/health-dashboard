import client from './client'
import type { AuthUser } from '../types'

export async function login(email: string, password: string): Promise<string> {
  const form = new URLSearchParams({ username: email, password })
  const { data } = await client.post<{ access_token: string }>('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data.access_token
}

export async function fetchMe(): Promise<AuthUser> {
  const { data } = await client.get<AuthUser>('/auth/me')
  return data
}
