/**
 * Convert astronomical coordinates to screen coordinates
 * @param ra Right Ascension in hours (0-24)
 * @param dec Declination in degrees (-90 to +90)
 * @param offsetX Pan offset X
 * @param offsetY Pan offset Y
 * @param scale Scale factor for the map
 * @returns {x, y} Screen coordinates
 */
export function raDecToScreen(
  ra: number,
  dec: number,
  offsetX: number,
  offsetY: number,
  scale: number = 30,
): { x: number; y: number } {
  // Convert RA (hours) to degrees: 24 hours = 360 degrees
  const raDegrees = ra * 15; // 360/24 = 15 degrees per hour

  // Use equirectangular projection
  // X = RA * scale, Y = -Dec * scale (negative because screen Y increases downward)
  const x = raDegrees * scale + offsetX;
  const y = -dec * scale + offsetY;

  return { x, y };
}

/**
 * Calculate if a point is inside a polygon (for constellation hit detection)
 */
export function pointInPolygon(
  point: { x: number; y: number },
  polygon: { x: number; y: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculate distance between two points
 */
export function distance(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate perpendicular distance from point to a line segment
 */
export function getPerpendicularDistance(
  p: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // If start and end point are the same, return distance to that point
  if (dx === 0 && dy === 0) {
    const distDx = p.x - lineStart.x;
    const distDy = p.y - lineStart.y;
    return Math.sqrt(distDx * distDx + distDy * distDy);
  }

  // Calculate area / length of base
  const numerator = Math.abs(
    dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x
  );
  const denominator = Math.sqrt(dx * dx + dy * dy);
  return numerator / denominator;
}

/**
 * Simplify a list of points using the Ramer-Douglas-Peucker algorithm
 */
export function ramerDouglasPeucker(
  points: { x: number; y: number }[],
  epsilon: number,
): { x: number; y: number }[] {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = getPerpendicularDistance(points[i], points[0], points[end]);
    if (d > maxDistance) {
      index = i;
      maxDistance = d;
    }
  }

  if (maxDistance > epsilon) {
    // Recursive call
    const results1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const results2 = ramerDouglasPeucker(points.slice(index), epsilon);

    // Build the result list (excluding the duplicate middle point)
    return results1.slice(0, results1.length - 1).concat(results2);
  }

  return [points[0], points[end]];
}

