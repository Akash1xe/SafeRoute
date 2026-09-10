import type { CalculatedRoute } from './types';

export function shouldSuggestReroute(
  currentRoute: CalculatedRoute | undefined,
  latestRoutes: readonly CalculatedRoute[],
): boolean {
  if (!currentRoute) return false;
  const latestSafest = latestRoutes.find(
    (route) => route.preference === 'SAFEST',
  );
  if (!latestSafest) return false;
  return routeSignature(currentRoute) !== routeSignature(latestSafest);
}

function routeSignature(route: CalculatedRoute): string {
  return route.nodeIds.join('>');
}
