import type { Pool } from 'pg';

import { RoadGraph } from '../../routing-engine/graph/graph.js';
import type {
  GraphEdge,
  GraphNode,
} from '../../routing-engine/graph/graph.types.js';

interface NodeRow {
  id: string;
  label: string | null;
  latitude: number;
  longitude: number;
}

interface EdgeRow {
  id: string;
  source_node_id: string;
  destination_node_id: string;
  distance_meters: number;
  duration_seconds: number;
  is_bidirectional: boolean;
  lighting_risk: string;
  incident_risk: string;
  isolation_risk: string;
  accident_risk: string;
  temporary_hazard_risk: string;
}

export interface RoadGraphSource {
  load(): Promise<RoadGraph>;
  listNodes(): Promise<GraphNode[]>;
}

export class RoadGraphRepository implements RoadGraphSource {
  constructor(private readonly database: Pool) {}

  async load(): Promise<RoadGraph> {
    const [nodes, segments] = await Promise.all([
      this.listNodes(),
      this.database.query<EdgeRow>(`
        SELECT id, source_node_id, destination_node_id, distance_meters,
          duration_seconds, is_bidirectional, lighting_risk, incident_risk,
          isolation_risk, accident_risk, temporary_hazard_risk
        FROM road_segments
        WHERE is_active = TRUE
      `),
    ]);

    const graph = new RoadGraph();
    nodes.forEach((node) => graph.addNode(node));

    for (const row of segments.rows) {
      const edge = mapEdge(row);
      graph.addEdge(edge);
      if (row.is_bidirectional) {
        graph.addEdge({
          ...edge,
          id: `${edge.id}:reverse`,
          source: edge.destination,
          destination: edge.source,
        });
      }
    }

    return graph;
  }

  async listNodes(): Promise<GraphNode[]> {
    const result = await this.database.query<NodeRow>(`
      SELECT id, label, ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude
      FROM road_nodes
      ORDER BY label NULLS LAST, id
    `);

    return result.rows.map((row) => ({
      id: row.id,
      ...(row.label ? { label: row.label } : {}),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }));
  }
}

function mapEdge(row: EdgeRow): GraphEdge {
  return {
    id: row.id,
    source: row.source_node_id,
    destination: row.destination_node_id,
    distanceMeters: Number(row.distance_meters),
    durationSeconds: row.duration_seconds,
    risk: {
      lighting: Number(row.lighting_risk),
      incident: Number(row.incident_risk),
      isolation: Number(row.isolation_risk),
      accident: Number(row.accident_risk),
      temporaryHazard: Number(row.temporary_hazard_risk),
    },
  };
}
