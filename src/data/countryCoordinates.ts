/**
 * Geographic coordinates (Latitude, Longitude) for countries
 * Used to position glowing lights on the 3D Guardian-style Globe.
 */

export interface CountryCoords {
  lat: number;
  lng: number;
  name: string;
  code: string;
  jitterRadius?: number; // Approximate span in degrees for natural dispersion
}

export const COUNTRY_COORDINATES: Record<string, CountryCoords> = {
  'afganistán': { lat: 33.9391, lng: 67.71, name: 'Afganistán', code: 'AF', jitterRadius: 2 },
  'albania': { lat: 41.1533, lng: 20.1683, name: 'Albania', code: 'AL', jitterRadius: 0.8 },
  'alemania': { lat: 51.1657, lng: 10.4515, name: 'Alemania', code: 'DE', jitterRadius: 1.8 },
  'andorra': { lat: 42.5063, lng: 1.5218, name: 'Andorra', code: 'AD', jitterRadius: 0.2 },
  'angola': { lat: -11.2027, lng: 17.8739, name: 'Angola', code: 'AO', jitterRadius: 3 },
  'argentina': { lat: -38.4161, lng: -63.6167, name: 'Argentina', code: 'AR', jitterRadius: 4 },
  'armenia': { lat: 40.0691, lng: 45.0382, name: 'Armenia', code: 'AM', jitterRadius: 0.8 },
  'australia': { lat: -25.2744, lng: 133.7751, name: 'Australia', code: 'AU', jitterRadius: 5 },
  'austria': { lat: 47.5162, lng: 14.5501, name: 'Austria', code: 'AT', jitterRadius: 1.2 },
  'bélgica': { lat: 50.5039, lng: 4.4699, name: 'Bélgica', code: 'BE', jitterRadius: 0.6 },
  'bolivia': { lat: -16.2902, lng: -63.5887, name: 'Bolivia', code: 'BO', jitterRadius: 2.5 },
  'brasil': { lat: -14.235, lng: -51.9253, name: 'Brasil', code: 'BR', jitterRadius: 5 },
  'canadá': { lat: 56.1304, lng: -106.3468, name: 'Canadá', code: 'CA', jitterRadius: 5 },
  'chile': { lat: -35.6751, lng: -71.543, name: 'Chile', code: 'CL', jitterRadius: 3 },
  'china': { lat: 35.8617, lng: 104.1954, name: 'China', code: 'CN', jitterRadius: 5 },
  'colombia': { lat: 4.5709, lng: -74.2973, name: 'Colombia', code: 'CO', jitterRadius: 2.5 },
  'corea del norte': { lat: 40.3399, lng: 127.5101, name: 'Corea del Norte', code: 'KP', jitterRadius: 1.2 },
  'corea del sur': { lat: 35.9078, lng: 127.7669, name: 'Corea del Sur', code: 'KR', jitterRadius: 1 },
  'costa rica': { lat: 9.7489, lng: -83.7534, name: 'Costa Rica', code: 'CR', jitterRadius: 0.8 },
  'cuba': { lat: 21.5218, lng: -77.7812, name: 'Cuba', code: 'CU', jitterRadius: 1.5 },
  'dinamarca': { lat: 56.2639, lng: 9.5018, name: 'Dinamarca', code: 'DK', jitterRadius: 1 },
  'ecuador': { lat: -1.8312, lng: -78.1834, name: 'Ecuador', code: 'EC', jitterRadius: 1.5 },
  'egipto': { lat: 26.8206, lng: 30.8025, name: 'Egipto', code: 'EG', jitterRadius: 2.5 },
  'el salvador': { lat: 13.7942, lng: -88.8965, name: 'El Salvador', code: 'SV', jitterRadius: 0.6 },
  'españa': { lat: 40.4637, lng: -3.7492, name: 'España', code: 'ES', jitterRadius: 2 },
  'estados unidos': { lat: 37.0902, lng: -95.7129, name: 'Estados Unidos', code: 'US', jitterRadius: 4.5 },
  'filipinas': { lat: 12.8797, lng: 121.774, name: 'Filipinas', code: 'PH', jitterRadius: 2 },
  'finlandia': { lat: 61.9241, lng: 25.7482, name: 'Finlandia', code: 'FI', jitterRadius: 2 },
  'francia': { lat: 46.2276, lng: 2.2137, name: 'Francia', code: 'FR', jitterRadius: 2 },
  'grecia': { lat: 39.0742, lng: 21.8243, name: 'Grecia', code: 'GR', jitterRadius: 1.5 },
  'guatemala': { lat: 15.7835, lng: -90.2308, name: 'Guatemala', code: 'GT', jitterRadius: 1 },
  'honduras': { lat: 15.2, lng: -86.2419, name: 'Honduras', code: 'HN', jitterRadius: 1 },
  'india': { lat: 20.5937, lng: 78.9629, name: 'India', code: 'IN', jitterRadius: 4 },
  'indonesia': { lat: -0.7893, lng: 113.9213, name: 'Indonesia', code: 'ID', jitterRadius: 3.5 },
  'irlanda': { lat: 53.1424, lng: -7.6921, name: 'Irlanda', code: 'IE', jitterRadius: 1 },
  'italia': { lat: 41.8719, lng: 12.5674, name: 'Italia', code: 'IT', jitterRadius: 2 },
  'japón': { lat: 36.2048, lng: 138.2529, name: 'Japón', code: 'JP', jitterRadius: 2.2 },
  'méxico': { lat: 23.6345, lng: -102.5528, name: 'México', code: 'MX', jitterRadius: 3.5 },
  'nicaragua': { lat: 12.8654, lng: -85.2072, name: 'Nicaragua', code: 'NI', jitterRadius: 1 },
  'noruega': { lat: 60.472, lng: 8.4689, name: 'Noruega', code: 'NO', jitterRadius: 2.5 },
  'países bajos': { lat: 52.1326, lng: 5.2913, name: 'Países Bajos', code: 'NL', jitterRadius: 0.6 },
  'panamá': { lat: 8.5379, lng: -80.7821, name: 'Panamá', code: 'PA', jitterRadius: 1 },
  'paraguay': { lat: -23.4425, lng: -58.4438, name: 'Paraguay', code: 'PY', jitterRadius: 2 },
  'perú': { lat: -9.19, lng: -75.0152, name: 'Perú', code: 'PE', jitterRadius: 2.5 },
  'polonia': { lat: 51.9194, lng: 19.1451, name: 'Polonia', code: 'PL', jitterRadius: 1.8 },
  'portugal': { lat: 39.3999, lng: -8.2245, name: 'Portugal', code: 'PT', jitterRadius: 1.2 },
  'puerto rico': { lat: 18.2208, lng: -66.5901, name: 'Puerto Rico', code: 'PR', jitterRadius: 0.5 },
  'reino unido': { lat: 55.3781, lng: -3.436, name: 'Reino Unido', code: 'GB', jitterRadius: 2 },
  'república dominicana': { lat: 18.7357, lng: -70.1627, name: 'República Dominicana', code: 'DO', jitterRadius: 0.8 },
  'rusia': { lat: 61.524, lng: 105.3188, name: 'Rusia', code: 'RU', jitterRadius: 6 },
  'suecia': { lat: 60.1282, lng: 18.6435, name: 'Suecia', code: 'SE', jitterRadius: 2.5 },
  'suiza': { lat: 46.8182, lng: 8.2275, name: 'Suiza', code: 'CH', jitterRadius: 0.8 },
  'tailandia': { lat: 15.87, lng: 100.9925, name: 'Tailandia', code: 'TH', jitterRadius: 2 },
  'turquía': { lat: 38.9637, lng: 35.2433, name: 'Turquía', code: 'TR', jitterRadius: 2.5 },
  'ucrania': { lat: 48.3794, lng: 31.1656, name: 'Ucrania', code: 'UA', jitterRadius: 2 },
  'uruguay': { lat: -32.5228, lng: -55.7658, name: 'Uruguay', code: 'UY', jitterRadius: 1.2 },
  'venezuela': { lat: 6.4238, lng: -66.5897, name: 'Venezuela', code: 'VE', jitterRadius: 2.5 }
};

/**
 * Normalizes text to match country name without accents and trimmed
 */
export function normalizeCountryName(country: string): string {
  return country
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Resolves country coordinates by checking exact or normalized matches
 */
export function getCountryCoordinates(countryName: string): CountryCoords | null {
  if (!countryName || countryName === 'No especificada' || countryName === 'todos') {
    return null;
  }

  const clean = countryName.toLowerCase().trim();
  if (COUNTRY_COORDINATES[clean]) {
    return COUNTRY_COORDINATES[clean];
  }

  const normalizedInput = normalizeCountryName(countryName);
  for (const [key, val] of Object.entries(COUNTRY_COORDINATES)) {
    if (normalizeCountryName(key) === normalizedInput || normalizeCountryName(val.name) === normalizedInput) {
      return val;
    }
  }

  // Partial match fallback
  for (const [key, val] of Object.entries(COUNTRY_COORDINATES)) {
    if (normalizedInput.includes(normalizeCountryName(key)) || normalizeCountryName(key).includes(normalizedInput)) {
      return val;
    }
  }

  return null;
}

/**
 * Converts Latitude and Longitude to 3D Cartesian Vector (x, y, z) on a sphere
 */
export function latLngToVector3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}
