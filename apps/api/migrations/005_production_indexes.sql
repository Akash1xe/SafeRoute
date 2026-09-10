CREATE INDEX incident_reports_reporter_created_idx
  ON incident_reports (reporter_id, created_at DESC);

CREATE INDEX incident_reports_active_expiry_idx
  ON incident_reports (expires_at)
  WHERE status IN ('PENDING', 'VERIFIED') AND expires_at IS NOT NULL;

CREATE INDEX incident_reports_active_location_gix
  ON incident_reports USING GIST (location)
  WHERE status IN ('PENDING', 'VERIFIED');

CREATE INDEX road_segments_active_updated_idx
  ON road_segments (updated_at DESC)
  WHERE is_active;

CREATE INDEX segment_risk_sources_segment_factor_idx
  ON segment_risk_sources (segment_id, factor);
