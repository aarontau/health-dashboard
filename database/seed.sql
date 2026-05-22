-- =============================================================================
-- Seed data — runs once on first database initialisation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- South African provinces
-- ---------------------------------------------------------------------------
INSERT INTO provinces (name, code) VALUES
    ('Gauteng',        'GP'),
    ('Western Cape',   'WC'),
    ('KwaZulu-Natal',  'KN'),
    ('Eastern Cape',   'EC'),
    ('Limpopo',        'LP'),
    ('Mpumalanga',     'MP'),
    ('North West',     'NW'),
    ('Free State',     'FS'),
    ('Northern Cape',  'NC')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Example district and sub-district (Vhembe, Limpopo) — for demo purposes
-- ---------------------------------------------------------------------------
INSERT INTO districts (province_id, name, code)
SELECT id, 'Vhembe District', 'LP-VH'
FROM provinces WHERE code = 'LP'
ON CONFLICT (code) DO NOTHING;

INSERT INTO sub_districts (district_id, name)
SELECT d.id, 'Makhado Local Municipality'
FROM districts d WHERE d.code = 'LP-VH'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Common ICD-10 codes (matches the bundled frontend list)
-- ---------------------------------------------------------------------------
INSERT INTO icd10_codes (code, description) VALUES
    ('J06.9',  'Acute upper respiratory infection, unspecified'),
    ('J18.9',  'Pneumonia, unspecified organism'),
    ('J45.9',  'Asthma, unspecified'),
    ('J00',    'Acute nasopharyngitis (common cold)'),
    ('J02.9',  'Acute pharyngitis, unspecified'),
    ('J03.9',  'Acute tonsillitis, unspecified'),
    ('A09',    'Other and unspecified gastroenteritis and colitis of infectious origin'),
    ('K29.7',  'Gastritis, unspecified'),
    ('K21.0',  'Gastro-oesophageal reflux disease with oesophagitis'),
    ('K59.0',  'Constipation'),
    ('K59.1',  'Functional diarrhoea'),
    ('I10',    'Essential (primary) hypertension'),
    ('I50.9',  'Heart failure, unspecified'),
    ('I25.9',  'Chronic ischaemic heart disease, unspecified'),
    ('E11.9',  'Type 2 diabetes mellitus without complications'),
    ('E11.6',  'Type 2 diabetes mellitus with other specified complications'),
    ('E10.9',  'Type 1 diabetes mellitus without complications'),
    ('E66.9',  'Obesity, unspecified'),
    ('E03.9',  'Hypothyroidism, unspecified'),
    ('B20',    'Human immunodeficiency virus [HIV] disease'),
    ('A15.0',  'Tuberculosis of lung'),
    ('A15.9',  'Respiratory tuberculosis, unspecified'),
    ('B50.9',  'Plasmodium falciparum malaria, unspecified'),
    ('A06.0',  'Acute amoebic dysentery'),
    ('B19.9',  'Unspecified viral hepatitis without hepatic coma'),
    ('M54.5',  'Low back pain'),
    ('M54.2',  'Cervicalgia'),
    ('M79.3',  'Panniculitis'),
    ('M25.5',  'Pain in joint'),
    ('R05',    'Cough'),
    ('R51',    'Headache'),
    ('R50.9',  'Fever, unspecified'),
    ('R10.9',  'Unspecified abdominal pain'),
    ('R11',    'Nausea and vomiting'),
    ('R07.9',  'Chest pain, unspecified'),
    ('R06.0',  'Dyspnoea'),
    ('R55',    'Syncope and collapse'),
    ('R00.0',  'Tachycardia, unspecified'),
    ('N39.0',  'Urinary tract infection, site not specified'),
    ('N30.0',  'Acute cystitis'),
    ('N10',    'Acute pyelonephritis'),
    ('O00.9',  'Ectopic pregnancy, unspecified'),
    ('O20.0',  'Threatened abortion'),
    ('O26.9',  'Pregnancy-related condition, unspecified'),
    ('L03.9',  'Cellulitis, unspecified'),
    ('L50.9',  'Urticaria, unspecified'),
    ('S09.9',  'Unspecified injury of head'),
    ('T14.9',  'Injury, unspecified'),
    ('Z34.9',  'Supervision of normal pregnancy, unspecified trimester'),
    ('Z71.1',  'Person with feared condition for which no diagnosis was made')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Demo facility (linked to the example sub-district above)
-- ---------------------------------------------------------------------------
INSERT INTO facilities (sub_district_id, name, facility_type)
SELECT sd.id, 'Makhado CHC', 'community_health_centre'
FROM sub_districts sd
JOIN districts d ON d.id = sd.district_id
WHERE d.code = 'LP-VH'
  AND sd.name = 'Makhado Local Municipality'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- NOTE: user accounts must be created via the API (POST /users/)
-- because passwords are bcrypt-hashed by the application.
--
-- Suggested first steps after the stack is running:
--   1. POST /users/  with role=national_officer to create your first admin
--      (you will need to temporarily relax the role check, or seed a
--       hashed password directly using Python):
--
--   python -c "from passlib.context import CryptContext; \
--              ctx = CryptContext(schemes=['bcrypt']); \
--              print(ctx.hash('YourPassword123'))"
--
--   Then INSERT INTO users (role, email, password_hash, first_name, last_name)
--   VALUES ('national_officer','admin@health.gov.za','<hash>','Admin','User');
-- ---------------------------------------------------------------------------
