-- =============================================================================
-- Health Consultation Dashboard System
-- PostgreSQL Database Schema
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'nurse',
    'doctor',
    'facility_manager',
    'district_officer',
    'provincial_officer',
    'national_officer',
    'minister'
);

CREATE TYPE facility_type AS ENUM (
    'clinic',
    'community_health_centre',
    'district_hospital',
    'regional_hospital',
    'tertiary_hospital'
);

CREATE TYPE sex AS ENUM ('male', 'female', 'intersex', 'unknown');

CREATE TYPE consultation_outcome AS ENUM (
    'treated_and_discharged',
    'referred',
    'admitted',
    'follow_up_scheduled',
    'left_without_being_seen',
    'deceased'
);

CREATE TYPE referral_priority AS ENUM ('routine', 'urgent', 'emergency');

CREATE TYPE referral_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');

CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'SELECT');


-- ---------------------------------------------------------------------------
-- GEOGRAPHIC HIERARCHY
-- National → Province → District → Sub-district → Facility
-- ---------------------------------------------------------------------------

CREATE TABLE provinces (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        CHAR(2)      NOT NULL UNIQUE,   -- e.g. GP, LP, WC
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE districts (
    id          SERIAL PRIMARY KEY,
    province_id INTEGER      NOT NULL REFERENCES provinces(id),
    name        VARCHAR(150) NOT NULL,
    code        VARCHAR(10)  NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (province_id, name)
);

CREATE TABLE sub_districts (
    id          SERIAL PRIMARY KEY,
    district_id INTEGER      NOT NULL REFERENCES districts(id),
    name        VARCHAR(150) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (district_id, name)
);

CREATE TABLE facilities (
    id              SERIAL PRIMARY KEY,
    sub_district_id INTEGER         NOT NULL REFERENCES sub_districts(id),
    name            VARCHAR(200)    NOT NULL,
    facility_type   facility_type   NOT NULL,
    -- SANC / HPCSA facility number
    facility_number VARCHAR(20)     UNIQUE,
    address         TEXT,
    gps_latitude    NUMERIC(9, 6),
    gps_longitude   NUMERIC(9, 6),
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- USERS  (staff accounts)
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    facility_id     INTEGER         REFERENCES facilities(id),  -- NULL for district+ roles
    district_id     INTEGER         REFERENCES districts(id),   -- populated for district officers
    province_id     INTEGER         REFERENCES provinces(id),   -- populated for provincial officers
    role            user_role       NOT NULL,
    -- login credentials
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   TEXT            NOT NULL,
    -- professional registration
    hpcsa_number    VARCHAR(30),
    sanc_number     VARCHAR(30),
    -- personal
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT true,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Enforce: clinic-level staff must have a facility; district officers must have a district, etc.
ALTER TABLE users ADD CONSTRAINT chk_user_scope CHECK (
    (role IN ('nurse', 'doctor', 'facility_manager') AND facility_id IS NOT NULL)
    OR (role = 'district_officer'   AND district_id  IS NOT NULL)
    OR (role = 'provincial_officer' AND province_id  IS NOT NULL)
    OR (role IN ('national_officer', 'minister'))
);


-- ---------------------------------------------------------------------------
-- PATIENTS  (anonymized — no names stored)
-- ---------------------------------------------------------------------------

CREATE TABLE patients (
    id              SERIAL PRIMARY KEY,
    -- SHA-256 hash of the national ID or passport number
    -- allows linking records without storing the actual ID
    national_id_hash    CHAR(64)    UNIQUE,
    -- demographic bucket — enough for epidemiology, not identification
    year_of_birth   SMALLINT        CHECK (year_of_birth BETWEEN 1900 AND EXTRACT(YEAR FROM now())::INT),
    sex             sex             NOT NULL,
    -- administrative district of residence (not the treating facility's district)
    residence_district_id INTEGER   REFERENCES districts(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- ICD-10 CODES  (reference table — pre-loaded)
-- ---------------------------------------------------------------------------

CREATE TABLE icd10_codes (
    code        VARCHAR(7)   PRIMARY KEY,   -- e.g. J06.9, A09
    description TEXT         NOT NULL,
    chapter     VARCHAR(5),                 -- e.g. X (Chapter 10)
    block       VARCHAR(10)                 -- e.g. J00-J06
);


-- ---------------------------------------------------------------------------
-- CONSULTATIONS  (core clinical record)
-- ---------------------------------------------------------------------------

CREATE TABLE consultations (
    id                  BIGSERIAL       PRIMARY KEY,
    facility_id         INTEGER         NOT NULL REFERENCES facilities(id),
    patient_id          INTEGER         NOT NULL REFERENCES patients(id),
    clinician_id        INTEGER         NOT NULL REFERENCES users(id),
    -- timing
    consultation_date   DATE            NOT NULL DEFAULT CURRENT_DATE,
    started_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    ended_at            TIMESTAMPTZ,
    -- clinical summary
    chief_complaint     TEXT            NOT NULL,
    clinical_notes      TEXT,
    outcome             consultation_outcome NOT NULL,
    follow_up_date      DATE,
    -- vitals snapshot
    systolic_bp         SMALLINT        CHECK (systolic_bp    BETWEEN 40 AND 300),
    diastolic_bp        SMALLINT        CHECK (diastolic_bp   BETWEEN 20 AND 200),
    heart_rate          SMALLINT        CHECK (heart_rate     BETWEEN 20 AND 300),
    temperature_celsius NUMERIC(4, 1)   CHECK (temperature_celsius BETWEEN 25 AND 45),
    oxygen_saturation   SMALLINT        CHECK (oxygen_saturation BETWEEN 0 AND 100),
    weight_kg           NUMERIC(5, 1)   CHECK (weight_kg      > 0),
    -- metadata
    is_new_patient      BOOLEAN         NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- CONSULTATION DIAGNOSES  (many-to-many: one consultation, multiple ICD-10)
-- ---------------------------------------------------------------------------

CREATE TABLE consultation_diagnoses (
    id                  BIGSERIAL   PRIMARY KEY,
    consultation_id     BIGINT      NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    icd10_code          VARCHAR(7)  NOT NULL REFERENCES icd10_codes(code),
    is_primary          BOOLEAN     NOT NULL DEFAULT false,  -- primary vs. secondary diagnosis
    confirmed           BOOLEAN     NOT NULL DEFAULT false,  -- suspected vs. confirmed
    UNIQUE (consultation_id, icd10_code)
);


-- ---------------------------------------------------------------------------
-- PRESCRIPTIONS
-- ---------------------------------------------------------------------------

CREATE TABLE prescriptions (
    id                  BIGSERIAL   PRIMARY KEY,
    consultation_id     BIGINT      NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    medicine_name       VARCHAR(200) NOT NULL,
    dose                VARCHAR(50),
    frequency           VARCHAR(50),   -- e.g. "8 hourly", "once daily"
    duration_days       SMALLINT,
    instructions        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- REFERRALS
-- ---------------------------------------------------------------------------

CREATE TABLE referrals (
    id                      BIGSERIAL           PRIMARY KEY,
    consultation_id         BIGINT              NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    referring_facility_id   INTEGER             NOT NULL REFERENCES facilities(id),
    receiving_facility_id   INTEGER             NOT NULL REFERENCES facilities(id),
    priority                referral_priority   NOT NULL,
    reason                  TEXT                NOT NULL,
    clinical_summary        TEXT,
    status                  referral_status     NOT NULL DEFAULT 'pending',
    referred_at             TIMESTAMPTZ         NOT NULL DEFAULT now(),
    accepted_at             TIMESTAMPTZ,
    completed_at            TIMESTAMPTZ,
    CONSTRAINT chk_different_facilities CHECK (referring_facility_id <> receiving_facility_id)
);


-- ---------------------------------------------------------------------------
-- AUDIT LOG  (immutable record of every data access and change)
-- ---------------------------------------------------------------------------

CREATE TABLE audit_logs (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         INTEGER         REFERENCES users(id),
    action          audit_action    NOT NULL,
    table_name      VARCHAR(100)    NOT NULL,
    record_id       BIGINT,
    -- JSON snapshot: {before: {...}, after: {...}}
    payload         JSONB,
    ip_address      INET,
    user_agent      TEXT,
    occurred_at     TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Audit logs must never be updated or deleted
CREATE RULE no_update_audit AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO audit_logs DO INSTEAD NOTHING;


-- ---------------------------------------------------------------------------
-- INDEXES  (query performance for dashboards and lookups)
-- ---------------------------------------------------------------------------

-- Consultation lookups — most common query pattern
CREATE INDEX idx_consultations_facility_date     ON consultations(facility_id, consultation_date DESC);
CREATE INDEX idx_consultations_patient           ON consultations(patient_id);
CREATE INDEX idx_consultations_clinician         ON consultations(clinician_id);
CREATE INDEX idx_consultations_outcome           ON consultations(outcome);

-- Geographic drill-down (join path: consultation → facility → sub_district → district → province)
CREATE INDEX idx_facilities_sub_district         ON facilities(sub_district_id);
CREATE INDEX idx_sub_districts_district          ON sub_districts(district_id);
CREATE INDEX idx_districts_province              ON districts(province_id);

-- Diagnosis trends
CREATE INDEX idx_consultation_diagnoses_icd10    ON consultation_diagnoses(icd10_code);
CREATE INDEX idx_consultation_diagnoses_consult  ON consultation_diagnoses(consultation_id);

-- Referral tracking
CREATE INDEX idx_referrals_status                ON referrals(status);
CREATE INDEX idx_referrals_receiving_facility    ON referrals(receiving_facility_id);

-- Audit queries by table and time
CREATE INDEX idx_audit_logs_table_time           ON audit_logs(table_name, occurred_at DESC);
CREATE INDEX idx_audit_logs_user                 ON audit_logs(user_id, occurred_at DESC);


-- ---------------------------------------------------------------------------
-- DASHBOARD VIEWS  (pre-computed aggregations for each stakeholder level)
-- ---------------------------------------------------------------------------

-- Facility-level: daily consultation summary
CREATE VIEW v_facility_daily_summary AS
SELECT
    c.facility_id,
    f.name                          AS facility_name,
    c.consultation_date,
    COUNT(*)                        AS total_consultations,
    COUNT(*) FILTER (WHERE c.is_new_patient)        AS new_patients,
    COUNT(*) FILTER (WHERE c.outcome = 'referred')  AS referrals_out,
    COUNT(*) FILTER (WHERE c.outcome = 'admitted')  AS admissions,
    ROUND(AVG(EXTRACT(EPOCH FROM (c.ended_at - c.started_at)) / 60), 1) AS avg_consult_minutes
FROM consultations c
JOIN facilities f ON f.id = c.facility_id
WHERE c.ended_at IS NOT NULL
GROUP BY c.facility_id, f.name, c.consultation_date;

-- District-level: rolling 7-day disease burden
CREATE VIEW v_district_disease_burden AS
SELECT
    d.id                            AS district_id,
    d.name                          AS district_name,
    cd.icd10_code,
    ic.description                  AS diagnosis_description,
    COUNT(*)                        AS case_count,
    MIN(c.consultation_date)        AS first_seen,
    MAX(c.consultation_date)        AS last_seen
FROM consultations c
JOIN consultation_diagnoses cd ON cd.consultation_id = c.id
JOIN icd10_codes ic            ON ic.code = cd.icd10_code
JOIN facilities f              ON f.id = c.facility_id
JOIN sub_districts sd          ON sd.id = f.sub_district_id
JOIN districts d               ON d.id = sd.district_id
WHERE cd.is_primary = true
  AND c.consultation_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY d.id, d.name, cd.icd10_code, ic.description;

-- Provincial-level: facility load comparison
CREATE VIEW v_provincial_facility_load AS
SELECT
    p.id                            AS province_id,
    p.name                          AS province_name,
    d.name                          AS district_name,
    f.id                            AS facility_id,
    f.name                          AS facility_name,
    f.facility_type,
    DATE_TRUNC('month', c.consultation_date)    AS month,
    COUNT(*)                                    AS consultations,
    COUNT(DISTINCT c.patient_id)                AS unique_patients,
    COUNT(*) FILTER (WHERE c.outcome = 'referred') AS referrals
FROM consultations c
JOIN facilities f    ON f.id = c.facility_id
JOIN sub_districts sd ON sd.id = f.sub_district_id
JOIN districts d     ON d.id = sd.district_id
JOIN provinces p     ON p.id = d.province_id
GROUP BY p.id, p.name, d.name, f.id, f.name, f.facility_type,
         DATE_TRUNC('month', c.consultation_date);

-- National-level: province comparison (for the Minister's dashboard)
CREATE VIEW v_national_province_summary AS
SELECT
    p.id                            AS province_id,
    p.name                          AS province_name,
    DATE_TRUNC('month', c.consultation_date) AS month,
    COUNT(*)                        AS total_consultations,
    COUNT(DISTINCT c.patient_id)    AS unique_patients,
    COUNT(DISTINCT c.facility_id)   AS active_facilities,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE c.outcome = 'referred') / NULLIF(COUNT(*), 0),
        2
    )                               AS referral_rate_pct
FROM consultations c
JOIN facilities f    ON f.id = c.facility_id
JOIN sub_districts sd ON sd.id = f.sub_district_id
JOIN districts d     ON d.id = sd.district_id
JOIN provinces p     ON p.id = d.province_id
GROUP BY p.id, p.name, DATE_TRUNC('month', c.consultation_date);


-- ---------------------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_consultations_updated_at
    BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
