import { useMemo } from 'react';

import {
  calculateBounds,
  pointsAttribute,
  projectPoint,
} from '../lib/map-geometry';
import type {
  CalculatedRoute,
  Incident,
  RoadNode,
  RoutePreference,
} from '../lib/types';

const routeColors: Record<RoutePreference, string> = {
  FASTEST: '#f7b955',
  BALANCED: '#5cc8ff',
  SAFEST: '#5df2b6',
};

const roadLinks = [
  ['sector-62', 'fortis-crossing'],
  ['fortis-crossing', 'electronic-city'],
  ['sector-62', 'community-park'],
  ['community-park', 'metro-walk'],
  ['metro-walk', 'electronic-city'],
  ['metro-walk', 'khora-crossing'],
  ['khora-crossing', 'electronic-city'],
] as const;

interface RouteMapProps {
  nodes: RoadNode[];
  routes: CalculatedRoute[];
  incidents: Incident[];
  selectedPreference: RoutePreference;
}

export function RouteMap({
  nodes,
  routes,
  incidents,
  selectedPreference,
}: RouteMapProps) {
  const bounds = useMemo(
    () => calculateBounds([...nodes, ...incidents]),
    [nodes, incidents],
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const selectedRoute = routes.find(
    (route) => route.preference === selectedPreference,
  );

  return (
    <div className="map-shell" aria-label="SafeRoute map">
      <svg
        className="route-map"
        viewBox="0 0 900 620"
        role="img"
        aria-label="Road network showing calculated routes and safety reports"
      >
        <defs>
          <pattern
            id="grid"
            width="48"
            height="48"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#17332d"
              strokeWidth="1"
            />
          </pattern>
          <filter
            id="route-glow"
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="900" height="620" fill="#07130f" />
        <rect width="900" height="620" fill="url(#grid)" opacity="0.6" />

        {roadLinks.map(([sourceId, destinationId]) => {
          const source = nodeById.get(sourceId);
          const destination = nodeById.get(destinationId);
          if (!source || !destination) return null;
          const from = projectPoint(source, bounds);
          const to = projectPoint(destination, bounds);
          return (
            <line
              key={`${sourceId}-${destinationId}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="base-road"
            />
          );
        })}

        {routes
          .filter((route) => route.preference !== selectedPreference)
          .map((route) => (
            <polyline
              key={route.preference}
              points={pointsAttribute(
                route.geometry.map((point) => projectPoint(point, bounds)),
              )}
              fill="none"
              stroke={routeColors[route.preference]}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.35"
              className="route-line"
            />
          ))}

        {selectedRoute ? (
          <polyline
            points={pointsAttribute(
              selectedRoute.geometry.map((point) =>
                projectPoint(point, bounds),
              ),
            )}
            fill="none"
            stroke={routeColors[selectedRoute.preference]}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#route-glow)"
            className="route-line selected"
          />
        ) : null}

        {incidents.map((incident) => {
          const point = projectPoint(incident, bounds);
          return (
            <g
              key={incident.id}
              transform={`translate(${point.x} ${point.y})`}
            >
              <circle r="14" className="incident-pulse" />
              <circle r="7" className="incident-dot" />
              <title>{`${incident.category.replaceAll('_', ' ')} · severity ${incident.severity}`}</title>
            </g>
          );
        })}

        {nodes.map((node) => {
          const point = projectPoint(node, bounds);
          const isEndpoint =
            selectedRoute?.nodeIds[0] === node.id ||
            selectedRoute?.nodeIds.at(-1) === node.id;
          return (
            <g key={node.id} transform={`translate(${point.x} ${point.y})`}>
              <circle
                r={isEndpoint ? 8 : 5}
                className={isEndpoint ? 'endpoint-node' : 'road-node'}
              />
              <text x="12" y="-11" className="node-label">
                {node.label ?? node.id}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="map-label">
        <span className="live-dot" /> Noida demo network
      </div>
      <div className="map-legend" aria-label="Map legend">
        <span>
          <i className="legend-line safest" /> Safer route
        </span>
        <span>
          <i className="legend-line fastest" /> Faster route
        </span>
        <span>
          <i className="legend-incident" /> Report
        </span>
      </div>
    </div>
  );
}
