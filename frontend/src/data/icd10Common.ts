export interface ICD10Entry {
  code: string
  description: string
}

export const ICD10_COMMON: ICD10Entry[] = [
  { code: 'J06.9',  description: 'Acute upper respiratory infection, unspecified' },
  { code: 'J18.9',  description: 'Pneumonia, unspecified organism' },
  { code: 'J45.9',  description: 'Asthma, unspecified' },
  { code: 'J00',    description: 'Acute nasopharyngitis (common cold)' },
  { code: 'J02.9',  description: 'Acute pharyngitis, unspecified' },
  { code: 'J03.9',  description: 'Acute tonsillitis, unspecified' },
  { code: 'A09',    description: 'Other and unspecified gastroenteritis and colitis of infectious origin' },
  { code: 'K29.7',  description: 'Gastritis, unspecified' },
  { code: 'K21.0',  description: 'Gastro-oesophageal reflux disease with oesophagitis' },
  { code: 'K59.0',  description: 'Constipation' },
  { code: 'K59.1',  description: 'Functional diarrhoea' },
  { code: 'I10',    description: 'Essential (primary) hypertension' },
  { code: 'I50.9',  description: 'Heart failure, unspecified' },
  { code: 'I25.9',  description: 'Chronic ischaemic heart disease, unspecified' },
  { code: 'E11.9',  description: 'Type 2 diabetes mellitus without complications' },
  { code: 'E11.6',  description: 'Type 2 diabetes mellitus with other specified complications' },
  { code: 'E10.9',  description: 'Type 1 diabetes mellitus without complications' },
  { code: 'E66.9',  description: 'Obesity, unspecified' },
  { code: 'E03.9',  description: 'Hypothyroidism, unspecified' },
  { code: 'B20',    description: 'Human immunodeficiency virus [HIV] disease' },
  { code: 'A15.0',  description: 'Tuberculosis of lung' },
  { code: 'A15.9',  description: 'Respiratory tuberculosis, unspecified' },
  { code: 'B50.9',  description: 'Plasmodium falciparum malaria, unspecified' },
  { code: 'A06.0',  description: 'Acute amoebic dysentery' },
  { code: 'B19.9',  description: 'Unspecified viral hepatitis without hepatic coma' },
  { code: 'M54.5',  description: 'Low back pain' },
  { code: 'M54.2',  description: 'Cervicalgia' },
  { code: 'M79.3',  description: 'Panniculitis' },
  { code: 'M25.5',  description: 'Pain in joint' },
  { code: 'R05',    description: 'Cough' },
  { code: 'R51',    description: 'Headache' },
  { code: 'R50.9',  description: 'Fever, unspecified' },
  { code: 'R10.9',  description: 'Unspecified abdominal pain' },
  { code: 'R11',    description: 'Nausea and vomiting' },
  { code: 'R07.9',  description: 'Chest pain, unspecified' },
  { code: 'R06.0',  description: 'Dyspnoea' },
  { code: 'R55',    description: 'Syncope and collapse' },
  { code: 'R00.0',  description: 'Tachycardia, unspecified' },
  { code: 'N39.0',  description: 'Urinary tract infection, site not specified' },
  { code: 'N30.0',  description: 'Acute cystitis' },
  { code: 'N10',    description: 'Acute pyelonephritis' },
  { code: 'O00.9',  description: 'Ectopic pregnancy, unspecified' },
  { code: 'O20.0',  description: 'Threatened abortion' },
  { code: 'O26.9',  description: 'Pregnancy-related condition, unspecified' },
  { code: 'L03.9',  description: 'Cellulitis, unspecified' },
  { code: 'L50.9',  description: 'Urticaria, unspecified' },
  { code: 'S09.9',  description: 'Unspecified injury of head' },
  { code: 'T14.9',  description: 'Injury, unspecified' },
  { code: 'Z34.9',  description: 'Supervision of normal pregnancy, unspecified trimester' },
  { code: 'Z71.1',  description: 'Person with feared condition for which no diagnosis was made' },
]

export function searchICD10(query: string): ICD10Entry[] {
  if (query.length < 2) return []
  const q = query.toLowerCase()
  return ICD10_COMMON
    .filter(e => e.code.toLowerCase().includes(q) || e.description.toLowerCase().includes(q))
    .slice(0, 8)
}
