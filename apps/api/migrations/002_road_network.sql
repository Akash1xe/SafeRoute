CREATE TABLE road_nodes (
  id VARCHAR(80) PRIMARY KEY,
  label VARCHAR(120),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX road_nodes_location_gix ON road_nodes USING GIST (location);

CREATE TABLE road_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id VARCHAR(80) NOT NULL REFERENCES road_nodes(id) ON DELETE RESTRICT,
  destination_node_id VARCHAR(80) NOT NULL REFERENCES road_nodes(id) ON DELETE RESTRICT,
  geometry GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  distance_meters DOUBLE PRECISION NOT NULL CHECK (distance_meters > 0),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  is_bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  lighting_risk NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (lighting_risk BETWEEN 0 AND 1),
  incident_risk NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (incident_risk BETWEEN 0 AND 1),
  isolation_risk NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (isolation_risk BETWEEN 0 AND 1),
  accident_risk NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (accident_risk BETWEEN 0 AND 1),
  temporary_hazard_risk NUMERIC(4, 3) NOT NULL DEFAULT 0 CHECK (temporary_hazard_risk BETWEEN 0 AND 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_node_id <> destination_node_id),
  UNIQUE (source_node_id, destination_node_id)
);

CREATE INDEX road_segments_geometry_gix ON road_segments USING GIST (geometry);
CREATE INDEX road_segments_source_active_idx ON road_segments (source_node_id) WHERE is_active;
CREATE INDEX road_segments_destination_active_idx ON road_segments (destination_node_id) WHERE is_active;
