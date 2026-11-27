ALTER TABLE public."GovtReport"
  ADD COLUMN IF NOT EXISTS priority_confidence numeric(5, 4);

ALTER TABLE public."GovtReport"
  ADD COLUMN priority_confidence_state numeric(5, 4)
    CONSTRAINT govt_report_priority_confidence_state_check
    CHECK (priority_confidence_state BETWEEN 0 AND 1),
  ADD COLUMN priority_confidence_district numeric(5, 4)
    CONSTRAINT govt_report_priority_confidence_district_check
    CHECK (priority_confidence_district BETWEEN 0 AND 1),
  ADD COLUMN priority_model_version_state text,
  ADD COLUMN priority_model_version_district text;

UPDATE public."GovtReport"
SET priority_confidence_state = priority_confidence,
    priority_confidence_district = priority_confidence,
    priority_model_version_state = priority_model_version,
    priority_model_version_district = priority_model_version;

ALTER TABLE public."GovtReport"
  DROP COLUMN priority_confidence,
  DROP COLUMN priority_model_version,
  DROP COLUMN severity_model_version;

COMMENT ON COLUMN public."GovtReport".priority_confidence_state IS
  'Confidence for the state-level priority score, from 0 to 1.';

COMMENT ON COLUMN public."GovtReport".priority_confidence_district IS
  'Confidence for the district-level priority score, from 0 to 1.';

COMMENT ON COLUMN public."GovtReport".priority_model_version_state IS
  'Model version used to calculate the state-level priority score.';

COMMENT ON COLUMN public."GovtReport".priority_model_version_district IS
  'Model version used to calculate the district-level priority score.';
