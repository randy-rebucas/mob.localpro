/**
 * Address suggestions via Photon (OpenStreetMap), biased toward the Philippines.
 * Data © OpenStreetMap contributors — https://openstreetmap.org/copyright
 */

export type AddressSuggestion = {
  id: string;
  /** Human-readable single line for the form */
  line: string;
  lat: number;
  lng: number;
};

type PhotonFeature = {
  geometry?: { type?: string; coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

type PhotonResponse = { features?: PhotonFeature[] };

/** Metro Manila — soft bias for LocalPro (PH marketplace). */
const BIAS_LAT = 14.5995;
const BIAS_LON = 120.9842;

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function buildLine(props: Record<string, unknown>): string {
  const housenumber = str(props.housenumber);
  const street = str(props.street);
  const line1 = [housenumber, street].filter(Boolean).join(' ').trim();
  const name = str(props.name);
  const first = line1 || name;

  const city = str(props.city || props.town || props.village || props.district || props.county);
  const state = str(props.state);
  const postcode = str(props.postcode);
  const mid = [city, state, postcode].filter(Boolean).join(', ');
  const country = str(props.country);

  return [first, mid, country].filter(Boolean).join(', ');
}

function featureId(props: Record<string, unknown>, index: number): string {
  const osm = props.osm_id;
  const typ = props.osm_type;
  if (typeof osm === 'number' || typeof osm === 'string') {
    return `${typ ?? 'osm'}:${osm}`;
  }
  return `idx:${index}`;
}

/**
 * Returns up to 8 address suggestions. Call with trimmed query length ≥ 3.
 */
export async function suggestAddresses(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    limit: '8',
    lang: 'en',
    lat: String(BIAS_LAT),
    lon: String(BIAS_LON),
  });

  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as PhotonResponse;
  const features = data.features ?? [];
  const out: AddressSuggestion[] = [];

  features.forEach((f, index) => {
    const coords = f.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return;
    const [lng, lat] = coords;
    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }
    const props = f.properties ?? {};
    const line = buildLine(props);
    if (!line) return;
    out.push({ id: featureId(props, index), line, lat, lng });
  });

  return out;
}
