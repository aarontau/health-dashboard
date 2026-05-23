export type UserRole =
  | 'nurse'
  | 'doctor'
  | 'facility_manager'
  | 'district_officer'
  | 'provincial_officer'
  | 'national_officer'
  | 'minister'

export type Sex = 'male' | 'female' | 'intersex' | 'unknown'

export type ConsultationOutcome =
  | 'treated_and_discharged'
  | 'referred'
  | 'admitted'
  | 'follow_up_scheduled'
  | 'left_without_being_seen'
  | 'deceased'

export type ReferralPriority = 'routine' | 'urgent' | 'emergency'
export type ReferralStatus = 'pending' | 'accepted' | 'rejected' | 'completed'

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

export interface Patient {
  id: number
  year_of_birth: number | null
  sex: Sex
  residence_district_id: number | null
  created_at: string
}

export interface Diagnosis {
  id: number
  consultation_id: number
  icd10_code: string
  is_primary: boolean
  confirmed: boolean
}

export interface Prescription {
  id: number
  consultation_id: number
  medicine_name: string
  dose: string | null
  frequency: string | null
  duration_days: number | null
  instructions: string | null
  created_at: string
}

export interface Referral {
  id: number
  consultation_id: number
  referring_facility_id: number
  receiving_facility_id: number
  priority: ReferralPriority
  reason: string
  clinical_summary: string | null
  status: ReferralStatus
  referred_at: string
  accepted_at: string | null
  completed_at: string | null
}

export interface ReferralCreate {
  receiving_facility_id: number
  priority: ReferralPriority
  reason: string
  clinical_summary?: string
}

export interface Facility {
  id: number
  name: string
  facility_type: string
  facility_number: string | null
}

export interface Consultation {
  id: number
  facility_id: number
  patient_id: number
  clinician_id: number
  consultation_date: string
  started_at: string
  ended_at: string | null
  chief_complaint: string
  clinical_notes: string | null
  outcome: ConsultationOutcome
  follow_up_date: string | null
  is_new_patient: boolean
  systolic_bp: number | null
  diastolic_bp: number | null
  heart_rate: number | null
  temperature_celsius: number | null
  oxygen_saturation: number | null
  weight_kg: number | null
  created_at: string
  diagnoses: Diagnosis[]
  prescriptions: Prescription[]
  referrals: Referral[]
}

export interface PatientCreate {
  national_id?: string
  year_of_birth?: number
  sex: Sex
  residence_district_id?: number
}

export interface DiagnosisCreate {
  icd10_code: string
  is_primary: boolean
  confirmed: boolean
}

export interface PrescriptionCreate {
  medicine_name: string
  dose?: string
  frequency?: string
  duration_days?: number
  instructions?: string
}

export interface ConsultationCreate {
  patient_id: number
  chief_complaint: string
  clinical_notes?: string
  outcome: ConsultationOutcome
  follow_up_date?: string
  is_new_patient: boolean
  systolic_bp?: number
  diastolic_bp?: number
  heart_rate?: number
  temperature_celsius?: number
  oxygen_saturation?: number
  weight_kg?: number
  diagnoses: DiagnosisCreate[]
  prescriptions: PrescriptionCreate[]
}
