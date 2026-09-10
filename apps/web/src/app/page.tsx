'use client';

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RouteMap } from '../components/route-map';
import { useRealtimeSafety } from '../hooks/use-realtime-safety';
import {
  authenticate,
  calculateRoutes,
  createIncident,
  getNearbyIncidents,
  getNodes,
  restoreSession,
} from '../lib/api';
import { shouldSuggestReroute } from '../lib/rerouting';
import {
  incidentCategories,
  type CalculatedRoute,
  type Incident,
  type IncidentCategory,
  type PublicUser,
  type RoadNode,
  type RoutePreference,
} from '../lib/types';

const demoNodes: RoadNode[] = [
  {
    id: 'sector-62',
    label: 'Sector 62',
    latitude: 28.6273,
    longitude: 77.3649,
  },
  {
    id: 'fortis-crossing',
    label: 'Fortis Crossing',
    latitude: 28.6248,
    longitude: 77.3702,
  },
  {
    id: 'electronic-city',
    label: 'Noida Electronic City',
    latitude: 28.628,
    longitude: 77.3751,
  },
  {
    id: 'community-park',
    label: 'Community Park',
    latitude: 28.6317,
    longitude: 77.368,
  },
  {
    id: 'metro-walk',
    label: 'Metro Walk',
    latitude: 28.6332,
    longitude: 77.3728,
  },
  {
    id: 'khora-crossing',
    label: 'Khora Crossing',
    latitude: 28.6321,
    longitude: 77.3782,
  },
];

const categoryLabels: Record<IncidentCategory, string> = {
  POOR_LIGHTING: 'Poor lighting',
  ACCIDENT: 'Accident',
  HARASSMENT: 'Harassment',
  CONSTRUCTION: 'Construction',
  ROAD_CLOSURE: 'Road closure',
  ISOLATED_AREA: 'Isolated area',
  FLOODING: 'Flooding',
  OTHER: 'Other hazard',
};

const routeCopy: Record<RoutePreference, { label: string; note: string }> = {
  FASTEST: { label: 'Fastest', note: 'Distance first' },
  BALANCED: { label: 'Balanced', note: 'Time + safety' },
  SAFEST: { label: 'Safest', note: 'Lowest exposure' },
};

export default function Home() {
  const [nodes, setNodes] = useState<RoadNode[]>(demoNodes);
  const [originId, setOriginId] = useState('sector-62');
  const [destinationId, setDestinationId] = useState('electronic-city');
  const [routes, setRoutes] = useState<CalculatedRoute[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedPreference, setSelectedPreference] =
    useState<RoutePreference>('SAFEST');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('Calculating safety-aware routes…');
  const [reportOpen, setReportOpen] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [suggestedRoutes, setSuggestedRoutes] = useState<
    CalculatedRoute[] | null
  >(null);
  const realtimeRefreshRunning = useRef(false);

  const loadSafetyContext = useCallback(async (availableNodes: RoadNode[]) => {
    const center =
      availableNodes.find((node) => node.id === 'metro-walk') ??
      availableNodes[0];
    if (!center) return;
    try {
      setIncidents(await getNearbyIncidents(center.latitude, center.longitude));
    } catch {
      setIncidents([]);
    }
  }, []);

  const findRoutes = useCallback(
    async (from: string, to: string) => {
      if (from === to) {
        setNotice('Choose two different locations.');
        return;
      }
      setLoading(true);
      setSuggestedRoutes(null);
      setNotice('Calculating safety-aware routes…');
      try {
        const results = await calculateRoutes(from, to);
        setRoutes(results);
        if (!results.some((route) => route.preference === selectedPreference)) {
          setSelectedPreference(results[0]?.preference ?? 'SAFEST');
        }
        setNotice(
          `${results.length} routes compared using current safety signals.`,
        );
      } catch (error) {
        setRoutes([]);
        setNotice(
          error instanceof Error
            ? error.message
            : 'Routes are temporarily unavailable.',
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedPreference],
  );

  useEffect(() => {
    void (async () => {
      let availableNodes = demoNodes;
      try {
        const fetchedNodes = await getNodes();
        if (fetchedNodes.length > 0) {
          availableNodes = fetchedNodes;
          setNodes(fetchedNodes);
        }
      } catch {
        setNotice('Using the demo network while the API reconnects.');
      }
      await Promise.all([
        findRoutes(originId, destinationId),
        loadSafetyContext(availableNodes),
        restoreSession().then((session) => {
          if (session) {
            setUser(session.user);
            setAccessToken(session.accessToken);
          }
        }),
      ]);
    })();
    // Initial data is intentionally loaded once with the seeded route defaults.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoute = useMemo(
    () => routes.find((route) => route.preference === selectedPreference),
    [routes, selectedPreference],
  );

  const handleSafetyEvent = useCallback(async () => {
    if (realtimeRefreshRunning.current) return;
    realtimeRefreshRunning.current = true;
    try {
      const latestRoutes = await calculateRoutes(originId, destinationId);
      await loadSafetyContext(nodes);
      const currentRoute = routes.find(
        (route) => route.preference === selectedPreference,
      );
      if (shouldSuggestReroute(currentRoute, latestRoutes)) {
        setSuggestedRoutes(latestRoutes);
        setNotice('Safety conditions changed near this trip.');
      } else {
        setRoutes(latestRoutes);
        setNotice('Route safety scores updated from the community network.');
      }
    } catch {
      setNotice('A safety update arrived. Refresh routes to review it.');
    } finally {
      realtimeRefreshRunning.current = false;
    }
  }, [
    destinationId,
    loadSafetyContext,
    nodes,
    originId,
    routes,
    selectedPreference,
  ]);

  const realtimeState = useRealtimeSafety(handleSafetyEvent);

  function swapLocations() {
    setOriginId(destinationId);
    setDestinationId(originId);
    void findRoutes(destinationId, originId);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="SafeRoute home">
          <span className="brand-mark">S</span>
          <span>SafeRoute</span>
        </a>
        <div className="topbar-status">
          <span className="network-status">
            <span className={`live-dot ${realtimeState}`} />{' '}
            {realtimeState === 'connected'
              ? 'Live safety updates on'
              : 'Reconnecting safety updates'}
          </span>
          <button className="report-button" onClick={() => setReportOpen(true)}>
            <span>+</span> Report a hazard
          </button>
        </div>
      </header>

      <section className="workspace" id="workspace">
        <aside className="control-panel">
          <div className="panel-heading">
            <p className="eyebrow">Plan a safer trip</p>
            <h1>Where are you going?</h1>
          </div>

          <div className="location-stack">
            <label>
              <span className="field-label">
                <i className="location-dot origin" /> Starting point
              </span>
              <select
                value={originId}
                onChange={(event) => setOriginId(event.target.value)}
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label ?? node.id}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="swap-button"
              onClick={swapLocations}
              aria-label="Swap starting point and destination"
            >
              ⇅
            </button>
            <label>
              <span className="field-label">
                <i className="location-dot destination" /> Destination
              </span>
              <select
                value={destinationId}
                onChange={(event) => setDestinationId(event.target.value)}
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label ?? node.id}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            className="primary-action"
            disabled={loading}
            onClick={() => void findRoutes(originId, destinationId)}
          >
            {loading ? 'Checking roads…' : 'Compare routes'} <span>→</span>
          </button>
          <p className="calculation-note" aria-live="polite">
            {notice}
          </p>

          <div className="route-list" aria-label="Route options">
            {routes.map((route) => (
              <button
                key={route.preference}
                className={`route-card ${
                  selectedPreference === route.preference ? 'active' : ''
                } ${route.preference.toLowerCase()}`}
                onClick={() => setSelectedPreference(route.preference)}
              >
                <span className="route-card-main">
                  <span>
                    <strong>{routeCopy[route.preference].label}</strong>
                    <small>{routeCopy[route.preference].note}</small>
                  </span>
                  <span className="route-time">
                    {Math.ceil(route.durationSeconds / 60)}
                    <small> min</small>
                  </span>
                </span>
                <span className="route-card-meta">
                  <span>{(route.distanceMeters / 1000).toFixed(1)} km</span>
                  <span className="safety-score">
                    {route.safetyScore}% safety
                  </span>
                  <span>{route.warnings.length} alerts</span>
                </span>
              </button>
            ))}
            {!loading && routes.length === 0 ? (
              <div className="empty-routes">
                Start the API to calculate routes on the seeded Noida network.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="map-panel">
          {suggestedRoutes ? (
            <div className="reroute-banner" role="status">
              <span className="reroute-icon">!</span>
              <span>
                <strong>A safer route is available</strong>
                <small>
                  Community risk changed near your trip. Review the updated
                  safest path.
                </small>
              </span>
              <button
                className="accept-reroute"
                onClick={() => {
                  setRoutes(suggestedRoutes);
                  setSelectedPreference('SAFEST');
                  setSuggestedRoutes(null);
                  setNotice('Updated safest route applied.');
                }}
              >
                Use safer route
              </button>
              <button
                className="dismiss-reroute"
                onClick={() => setSuggestedRoutes(null)}
                aria-label="Dismiss rerouting suggestion"
              >
                ×
              </button>
            </div>
          ) : null}
          <RouteMap
            nodes={nodes}
            routes={routes}
            incidents={incidents}
            selectedPreference={selectedPreference}
          />

          <div className="trip-summary">
            <div>
              <span className="summary-label">Selected route</span>
              <strong>
                {selectedRoute
                  ? routeCopy[selectedRoute.preference].label
                  : 'Waiting for route'}
              </strong>
            </div>
            <div>
              <span className="summary-label">Safety score</span>
              <strong className="mint-value">
                {selectedRoute ? `${selectedRoute.safetyScore}/100` : '—'}
              </strong>
            </div>
            <div>
              <span className="summary-label">Community signals</span>
              <strong>{incidents.length} nearby</strong>
            </div>
            <div>
              <span className="summary-label">High-risk alerts</span>
              <strong>{selectedRoute?.warnings.length ?? 0}</strong>
            </div>
          </div>
        </section>
      </section>

      {reportOpen ? (
        <ReportDialog
          nodes={nodes}
          user={user}
          accessToken={accessToken}
          onAuthenticated={(result) => {
            setUser(result.user);
            setAccessToken(result.accessToken);
          }}
          onCreated={(incident) => {
            setIncidents((current) => [incident, ...current]);
            setReportOpen(false);
            setNotice('Report submitted. Road risk is being recalculated.');
          }}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </main>
  );
}

interface ReportDialogProps {
  nodes: RoadNode[];
  user: PublicUser | null;
  accessToken: string | null;
  onAuthenticated: (result: { user: PublicUser; accessToken: string }) => void;
  onCreated: (incident: Incident) => void;
  onClose: () => void;
}

function ReportDialog({
  nodes,
  user,
  accessToken,
  onAuthenticated,
  onCreated,
  onClose,
}: ReportDialogProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authError, setAuthError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setAuthError('');
    const data = new FormData(event.currentTarget);
    try {
      onAuthenticated(
        await authenticate(authMode, {
          ...(authMode === 'register'
            ? { name: String(data.get('name')) }
            : {}),
          email: String(data.get('email')),
          password: String(data.get('password')),
        }),
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Authentication failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setSubmitting(true);
    setFormError('');
    const data = new FormData(event.currentTarget);
    const node = nodes.find(
      (candidate) => candidate.id === data.get('location'),
    );
    if (!node) {
      setSubmitting(false);
      setFormError('Choose a valid report location.');
      return;
    }
    try {
      const incident = await createIncident(accessToken, {
        category: data.get('category') as IncidentCategory,
        description: String(data.get('description')),
        severity: Number(data.get('severity')),
        latitude: node.latitude,
        longitude: node.longitude,
      });
      onCreated(incident);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'The report could not be submitted.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="close-dialog"
          onClick={onClose}
          aria-label="Close report form"
        >
          ×
        </button>
        <p className="eyebrow">Community safety signal</p>
        <h2 id="report-title">Report a road hazard</h2>
        <p className="dialog-copy">
          Reports are confidence-scored and decay over time before affecting
          route recommendations.
        </p>

        {!user || !accessToken ? (
          <form
            className="dialog-form"
            onSubmit={(event) => void submitAuth(event)}
          >
            <div
              className="mode-switch"
              role="group"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Create account
              </button>
            </div>
            {authMode === 'register' ? (
              <label>
                <span>Your name</span>
                <input name="name" minLength={2} autoFocus required />
              </label>
            ) : null}
            <label>
              <span>Email</span>
              <input
                name="email"
                type="email"
                autoFocus={authMode === 'login'}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                name="password"
                type="password"
                minLength={authMode === 'register' ? 10 : 1}
                required
              />
            </label>
            {authMode === 'register' ? (
              <small className="password-note">
                Use 10+ characters with uppercase, lowercase, and a number.
              </small>
            ) : null}
            {authError ? (
              <p className="form-error" role="alert">
                {authError}
              </p>
            ) : null}
            <button className="primary-action" disabled={submitting}>
              {submitting
                ? 'Please wait…'
                : authMode === 'login'
                  ? 'Sign in to report'
                  : 'Create account'}
            </button>
          </form>
        ) : (
          <form
            className="dialog-form"
            onSubmit={(event) => void submitReport(event)}
          >
            <div className="signed-in-row">
              <span className="avatar">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span>
                <small>Reporting as</small>
                <strong>{user.name}</strong>
              </span>
              <em>{Math.round(user.trustScore * 100)}% trust</em>
            </div>
            <div className="form-grid">
              <label>
                <span>Hazard type</span>
                <select name="category" defaultValue="POOR_LIGHTING" autoFocus>
                  {incidentCategories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Severity</span>
                <select name="severity" defaultValue="3">
                  {[1, 2, 3, 4, 5].map((severity) => (
                    <option key={severity} value={severity}>
                      {severity} —{' '}
                      {severity === 1
                        ? 'Low'
                        : severity === 5
                          ? 'Critical'
                          : 'Moderate'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>Nearest location</span>
              <select name="location">
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label ?? node.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>What happened?</span>
              <textarea
                name="description"
                minLength={10}
                maxLength={1000}
                placeholder="Describe the hazard clearly so others can verify it."
                required
              />
            </label>
            {formError ? (
              <p className="form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <button className="primary-action" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit safety report'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
