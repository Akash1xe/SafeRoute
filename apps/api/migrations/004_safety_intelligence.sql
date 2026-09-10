ALTER TABLE road_segments
  ADD COLUMN dynamic_lighting_risk NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (dynamic_lighting_risk BETWEEN 0 AND 1),
  ADD COLUMN dynamic_incident_risk NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (dynamic_incident_risk BETWEEN 0 AND 1),
  ADD COLUMN dynamic_isolation_risk NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (dynamic_isolation_risk BETWEEN 0 AND 1),
  ADD COLUMN dynamic_accident_risk NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (dynamic_accident_risk BETWEEN 0 AND 1),
  ADD COLUMN dynamic_temporary_hazard_risk NUMERIC(4, 3) NOT NULL DEFAULT 0
    CHECK (dynamic_temporary_hazard_risk BETWEEN 0 AND 1);

CREATE TABLE segment_risk_sources (
  segment_id UUID NOT NULL REFERENCES road_segments(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  factor VARCHAR(30) NOT NULL CHECK (factor IN (
    'lighting', 'incident', 'isolation', 'accident', 'temporaryHazard'
  )),
  effective_risk NUMERIC(4, 3) NOT NULL CHECK (effective_risk BETWEEN 0 AND 1),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (segment_id, report_id)
);

CREATE INDEX segment_risk_sources_report_idx ON segment_risk_sources (report_id);
