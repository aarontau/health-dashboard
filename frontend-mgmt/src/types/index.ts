export type UserRole =
  | 'nurse' | 'doctor' | 'facility_manager'
  | 'district_officer' | 'provincial_officer'
  | 'national_officer' | 'minister'

export interface AuthUser {
  id: number
  email: string
  role: UserRole
  first_name: string
  last_name: string
  facility_id: number | null
  district_id: number | null
  province_id: number | null
}

// v_district_disease_burden
export interface DiseaseBurdenRow {
  district_id: number
  district_name: string
  icd10_code: string
  diagnosis_description: string
  case_count: number
  first_seen: string
  last_seen: string
}

// v_provincial_facility_load
export interface FacilityLoadRow {
  province_id: number
  province_name: string
  district_name: string
  facility_id: number
  facility_name: string
  facility_type: string
  month: string
  consultations: number
  unique_patients: number
  referrals: number
}

// v_national_province_summary
export interface ProvinceSummaryRow {
  province_id: number
  province_name: string
  month: string
  total_consultations: number
  unique_patients: number
  active_facilities: number
  referral_rate_pct: number
}

// v_facility_daily_summary
export interface FacilityDailySummaryRow {
  facility_id: number
  facility_name: string
  consultation_date: string
  total_consultations: number
  new_patients: number
  referrals_out: number
  admissions: number
  avg_consult_minutes: number | null
}
