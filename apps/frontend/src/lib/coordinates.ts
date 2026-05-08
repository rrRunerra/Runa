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
