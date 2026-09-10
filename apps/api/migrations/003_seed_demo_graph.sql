INSERT INTO road_nodes (id, label, location) VALUES
  ('sector-62', 'Sector 62', ST_SetSRID(ST_MakePoint(77.3649, 28.6273), 4326)::geography),
  ('fortis-crossing', 'Fortis Crossing', ST_SetSRID(ST_MakePoint(77.3702, 28.6248), 4326)::geography),
  ('electronic-city', 'Noida Electronic City', ST_SetSRID(ST_MakePoint(77.3751, 28.6280), 4326)::geography),
  ('community-park', 'Community Park', ST_SetSRID(ST_MakePoint(77.3680, 28.6317), 4326)::geography),
  ('metro-walk', 'Metro Walk', ST_SetSRID(ST_MakePoint(77.3728, 28.6332), 4326)::geography),
  ('khora-crossing', 'Khora Crossing', ST_SetSRID(ST_MakePoint(77.3782, 28.6321), 4326)::geography)
ON CONFLICT (id) DO NOTHING;

INSERT INTO road_segments (
  source_node_id, destination_node_id, geometry, distance_meters, duration_seconds,
  lighting_risk, incident_risk, isolation_risk, accident_risk, temporary_hazard_risk
) VALUES
  ('sector-62', 'fortis-crossing', ST_GeogFromText('SRID=4326;LINESTRING(77.3649 28.6273, 77.3702 28.6248)'), 610, 360, 0.15, 0.20, 0.10, 0.25, 0.05),
  ('fortis-crossing', 'electronic-city', ST_GeogFromText('SRID=4326;LINESTRING(77.3702 28.6248, 77.3751 28.6280)'), 590, 330, 0.80, 0.75, 0.65, 0.35, 0.10),
  ('sector-62', 'community-park', ST_GeogFromText('SRID=4326;LINESTRING(77.3649 28.6273, 77.3680 28.6317)'), 670, 390, 0.08, 0.05, 0.10, 0.08, 0.02),
  ('community-park', 'metro-walk', ST_GeogFromText('SRID=4326;LINESTRING(77.3680 28.6317, 77.3728 28.6332)'), 520, 300, 0.05, 0.08, 0.12, 0.05, 0.02),
  ('metro-walk', 'electronic-city', ST_GeogFromText('SRID=4326;LINESTRING(77.3728 28.6332, 77.3751 28.6280)'), 710, 420, 0.10, 0.05, 0.15, 0.10, 0.02),
  ('metro-walk', 'khora-crossing', ST_GeogFromText('SRID=4326;LINESTRING(77.3728 28.6332, 77.3782 28.6321)'), 560, 330, 0.30, 0.20, 0.25, 0.40, 0.05),
  ('khora-crossing', 'electronic-city', ST_GeogFromText('SRID=4326;LINESTRING(77.3782 28.6321, 77.3751 28.6280)'), 600, 360, 0.25, 0.20, 0.30, 0.25, 0.05)
ON CONFLICT (source_node_id, destination_node_id) DO NOTHING;
