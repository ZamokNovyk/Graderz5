/**
 * Geographic coordinates (Latitude, Longitude) for countries
 * Used to position glowing lights on the 3D Guardian-style Globe.
 */

export interface CountryRegion {
  name: string;
  lat: number;
  lng: number;
}

export interface CountryCoords {
  lat: number;
  lng: number;
  name: string;
  code: string;
  jitterRadius?: number; // Approximate span in degrees for natural dispersion
  regions?: CountryRegion[];
}

export const COUNTRY_COORDINATES: Record<string, CountryCoords> = {
  'afganistán': { lat: 33.9391, lng: 67.71, name: 'Afganistán', code: 'AF', jitterRadius: 2 },
  'albania': { lat: 41.1533, lng: 20.1683, name: 'Albania', code: 'AL', jitterRadius: 0.8 },
  'alemania': { lat: 51.1657, lng: 10.4515, name: 'Alemania', code: 'DE', jitterRadius: 2.2,
    regions: [
      { name: 'Berlín', lat: 52.52, lng: 13.405 },
      { name: 'Hamburgo', lat: 53.5511, lng: 9.9937 },
      { name: 'Múnich', lat: 48.1351, lng: 11.582 },
      { name: 'Colonia', lat: 50.9375, lng: 6.9603 },
      { name: 'Fráncfort', lat: 50.1109, lng: 8.6821 }
    ]
  },
  'andorra': { lat: 42.5063, lng: 1.5218, name: 'Andorra', code: 'AD', jitterRadius: 0.2 },
  'angola': { lat: -11.2027, lng: 17.8739, name: 'Angola', code: 'AO', jitterRadius: 3 },
  'argentina': { lat: -38.4161, lng: -63.6167, name: 'Argentina', code: 'AR', jitterRadius: 5,
    regions: [
      { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
      { name: 'Córdoba', lat: -31.4201, lng: -64.1888 },
      { name: 'Rosario', lat: -32.9468, lng: -60.6393 },
      { name: 'Mendoza', lat: -32.8895, lng: -68.8458 },
      { name: 'San Miguel de Tucumán', lat: -26.8083, lng: -65.2176 },
      { name: 'La Plata', lat: -34.9214, lng: -57.9545 },
      { name: 'Mar del Plata', lat: -38.0055, lng: -57.556 },
      { name: 'Salta', lat: -24.7821, lng: -65.4232 },
      { name: 'Bariloche', lat: -41.1335, lng: -71.3103 },
      { name: 'Neuquén', lat: -38.9516, lng: -68.0591 },
      { name: 'Ushuaia', lat: -54.8019, lng: -68.303 }
    ]
  },
  'armenia': { lat: 40.0691, lng: 45.0382, name: 'Armenia', code: 'AM', jitterRadius: 0.8 },
  'australia': { lat: -25.2744, lng: 133.7751, name: 'Australia', code: 'AU', jitterRadius: 5 },
  'austria': { lat: 47.5162, lng: 14.5501, name: 'Austria', code: 'AT', jitterRadius: 1.2 },
  'bélgica': { lat: 50.5039, lng: 4.4699, name: 'Bélgica', code: 'BE', jitterRadius: 0.6 },
  'bolivia': { lat: -16.2902, lng: -63.5887, name: 'Bolivia', code: 'BO', jitterRadius: 3,
    regions: [
      { name: 'La Paz', lat: -16.5, lng: -68.15 },
      { name: 'Santa Cruz de la Sierra', lat: -17.8, lng: -63.1833 },
      { name: 'Cochabamba', lat: -17.3895, lng: -66.1568 },
      { name: 'Sucre', lat: -19.0333, lng: -65.2627 },
      { name: 'Tarija', lat: -21.5355, lng: -64.7296 },
      { name: 'Oruro', lat: -17.9833, lng: -67.15 }
    ]
  },
  'brasil': { lat: -14.235, lng: -51.9253, name: 'Brasil', code: 'BR', jitterRadius: 5,
    regions: [
      { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
      { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
      { name: 'Brasília', lat: -15.7975, lng: -47.8919 },
      { name: 'Salvador', lat: -12.9777, lng: -38.5016 },
      { name: 'Fortaleza', lat: -3.7172, lng: -38.5433 },
      { name: 'Belo Horizonte', lat: -19.9167, lng: -43.9345 },
      { name: 'Manaus', lat: -3.119, lng: -60.0217 },
      { name: 'Curitiba', lat: -25.4284, lng: -49.2733 },
      { name: 'Porto Alegre', lat: -30.0346, lng: -51.2177 }
    ]
  },
  'canadá': { lat: 56.1304, lng: -106.3468, name: 'Canadá', code: 'CA', jitterRadius: 5 },
  'chile': { lat: -35.6751, lng: -71.543, name: 'Chile', code: 'CL', jitterRadius: 4,
    regions: [
      { name: 'Santiago', lat: -33.4489, lng: -70.6693 },
      { name: 'Valparaíso', lat: -33.0472, lng: -71.6127 },
      { name: 'Concepción', lat: -36.8201, lng: -73.0444 },
      { name: 'La Serena', lat: -29.9027, lng: -71.2519 },
      { name: 'Antofagasta', lat: -23.6509, lng: -70.3975 },
      { name: 'Temuco', lat: -38.7359, lng: -72.5904 },
      { name: 'Puerto Montt', lat: -41.4693, lng: -72.9424 },
      { name: 'Iquique', lat: -20.2307, lng: -70.1357 },
      { name: 'Punta Arenas', lat: -53.1638, lng: -70.9171 }
    ]
  },
  'china': { lat: 35.8617, lng: 104.1954, name: 'China', code: 'CN', jitterRadius: 5 },
  'colombia': { lat: 4.5709, lng: -74.2973, name: 'Colombia', code: 'CO', jitterRadius: 3,
    regions: [
      { name: 'Bogotá', lat: 4.711, lng: -74.0721 },
      { name: 'Medellín', lat: 6.2442, lng: -75.5812 },
      { name: 'Cali', lat: 3.4516, lng: -76.532 },
      { name: 'Barranquilla', lat: 10.9685, lng: -74.7813 },
      { name: 'Cartagena', lat: 10.391, lng: -75.4794 },
      { name: 'Bucaramanga', lat: 7.1254, lng: -73.1198 },
      { name: 'Pereira', lat: 4.8133, lng: -75.6961 },
      { name: 'Santa Marta', lat: 11.2408, lng: -74.199 },
      { name: 'Cúcuta', lat: 7.8939, lng: -72.5078 },
      { name: 'Pasto', lat: 1.2136, lng: -77.2811 }
    ]
  },
  'corea del norte': { lat: 40.3399, lng: 127.5101, name: 'Corea del Norte', code: 'KP', jitterRadius: 1.2 },
  'corea del sur': { lat: 35.9078, lng: 127.7669, name: 'Corea del Sur', code: 'KR', jitterRadius: 1.2 },
  'costa rica': { lat: 9.7489, lng: -83.7534, name: 'Costa Rica', code: 'CR', jitterRadius: 0.8 },
  'cuba': { lat: 21.5218, lng: -77.7812, name: 'Cuba', code: 'CU', jitterRadius: 1.5 },
  'dinamarca': { lat: 56.2639, lng: 9.5018, name: 'Dinamarca', code: 'DK', jitterRadius: 1 },
  'ecuador': { lat: -1.8312, lng: -78.1834, name: 'Ecuador', code: 'EC', jitterRadius: 2,
    regions: [
      { name: 'Quito', lat: -0.1807, lng: -78.4678 },
      { name: 'Guayaquil', lat: -2.1894, lng: -79.8891 },
      { name: 'Cuenca', lat: -2.9001, lng: -79.0059 },
      { name: 'Manta', lat: -0.9677, lng: -80.7089 },
      { name: 'Ambato', lat: -1.2491, lng: -78.6168 },
      { name: 'Loja', lat: -3.9931, lng: -79.2042 }
    ]
  },
  'egipto': { lat: 26.8206, lng: 30.8025, name: 'Egipto', code: 'EG', jitterRadius: 2.5 },
  'el salvador': { lat: 13.7942, lng: -88.8965, name: 'El Salvador', code: 'SV', jitterRadius: 0.6 },
  'españa': { lat: 40.4637, lng: -3.7492, name: 'España', code: 'ES', jitterRadius: 3,
    regions: [
      { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
      { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
      { name: 'Valencia', lat: 39.4699, lng: -0.3763 },
      { name: 'Sevilla', lat: 37.3891, lng: -5.9845 },
      { name: 'Zaragoza', lat: 41.6488, lng: -0.8891 },
      { name: 'Málaga', lat: 36.7213, lng: -4.4214 },
      { name: 'Bilbao', lat: 43.263, lng: -2.935 },
      { name: 'A Coruña', lat: 43.3623, lng: -8.4115 },
      { name: 'Las Palmas', lat: 28.1235, lng: -15.4363 }
    ]
  },
  'estados unidos': { lat: 37.0902, lng: -95.7129, name: 'Estados Unidos', code: 'US', jitterRadius: 5,
    regions: [
      { name: 'New York', lat: 40.7128, lng: -74.006 },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
      { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
      { name: 'Houston', lat: 29.7604, lng: -95.3698 },
      { name: 'Miami', lat: 25.7617, lng: -80.1918 },
      { name: 'Seattle', lat: 47.6062, lng: -122.3321 },
      { name: 'San Francisco', lat: 37.7749, lng: -122.4194 }
    ]
  },
  'filipinas': { lat: 12.8797, lng: 121.774, name: 'Filipinas', code: 'PH', jitterRadius: 2 },
  'finlandia': { lat: 61.9241, lng: 25.7482, name: 'Finlandia', code: 'FI', jitterRadius: 2 },
  'francia': { lat: 46.2276, lng: 2.2137, name: 'Francia', code: 'FR', jitterRadius: 2.5 },
  'grecia': { lat: 39.0742, lng: 21.8243, name: 'Grecia', code: 'GR', jitterRadius: 1.5 },
  'guatemala': { lat: 15.7835, lng: -90.2308, name: 'Guatemala', code: 'GT', jitterRadius: 1 },
  'honduras': { lat: 15.2, lng: -86.2419, name: 'Honduras', code: 'HN', jitterRadius: 1 },
  'india': { lat: 20.5937, lng: 78.9629, name: 'India', code: 'IN', jitterRadius: 4 },
  'indonesia': { lat: -0.7893, lng: 113.9213, name: 'Indonesia', code: 'ID', jitterRadius: 3.5 },
  'irlanda': { lat: 53.1424, lng: -7.6921, name: 'Irlanda', code: 'IE', jitterRadius: 1 },
  'italia': { lat: 41.8719, lng: 12.5674, name: 'Italia', code: 'IT', jitterRadius: 2 },
  'japón': { lat: 36.2048, lng: 138.2529, name: 'Japón', code: 'JP', jitterRadius: 2.5 },
  'méxico': { lat: 23.6345, lng: -102.5528, name: 'México', code: 'MX', jitterRadius: 4,
    regions: [
      { name: 'Ciudad de México', lat: 19.4326, lng: -99.1332 },
      { name: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
      { name: 'Monterrey', lat: 25.6866, lng: -100.3161 },
      { name: 'Puebla', lat: 19.0414, lng: -98.2063 },
      { name: 'Tijuana', lat: 32.5149, lng: -117.0382 },
      { name: 'Mérida', lat: 20.9674, lng: -89.5926 },
      { name: 'Cancún', lat: 21.1619, lng: -86.8515 },
      { name: 'León', lat: 21.1221, lng: -101.6827 },
      { name: 'Querétaro', lat: 20.5888, lng: -100.3899 },
      { name: 'Hermosillo', lat: 29.0729, lng: -110.9559 }
    ]
  },
  'nicaragua': { lat: 12.8654, lng: -85.2072, name: 'Nicaragua', code: 'NI', jitterRadius: 1 },
  'noruega': { lat: 60.472, lng: 8.4689, name: 'Noruega', code: 'NO', jitterRadius: 2.5 },
  'países bajos': { lat: 52.1326, lng: 5.2913, name: 'Países Bajos', code: 'NL', jitterRadius: 0.6 },
  'panamá': { lat: 8.5379, lng: -80.7821, name: 'Panamá', code: 'PA', jitterRadius: 1 },
  'paraguay': { lat: -23.4425, lng: -58.4438, name: 'Paraguay', code: 'PY', jitterRadius: 2 },
  'perú': {
    lat: -9.19,
    lng: -75.0152,
    name: 'Perú',
    code: 'PE',
    jitterRadius: 4.5,
    regions: [
      { name: 'Lima y Callao', lat: -12.0464, lng: -77.0428 },
      { name: 'Arequipa', lat: -16.4090, lng: -71.5375 },
      { name: 'Trujillo', lat: -8.1116, lng: -79.0287 },
      { name: 'Chiclayo', lat: -6.7714, lng: -79.8409 },
      { name: 'Piura', lat: -5.1945, lng: -80.6328 },
      { name: 'Cusco', lat: -13.5319, lng: -71.9675 },
      { name: 'Iquitos', lat: -3.7437, lng: -73.2516 },
      { name: 'Huancayo', lat: -12.0651, lng: -75.2049 },
      { name: 'Tacna', lat: -18.0146, lng: -70.2536 },
      { name: 'Pucallpa', lat: -8.3791, lng: -74.5539 },
      { name: 'Chimbote', lat: -9.0745, lng: -78.5936 },
      { name: 'Puno', lat: -15.8422, lng: -70.0199 },
      { name: 'Cajamarca', lat: -7.1617, lng: -78.5128 },
      { name: 'Tarapoto', lat: -6.4866, lng: -76.3683 },
      { name: 'Ayacucho', lat: -13.1588, lng: -74.2239 },
      { name: 'Tumbes', lat: -3.5669, lng: -80.4515 },
      { name: 'Huaraz', lat: -9.5261, lng: -77.5288 },
      { name: 'Ica', lat: -14.0678, lng: -75.7286 },
      { name: 'Puerto Maldonado', lat: -12.5933, lng: -69.1891 },
      { name: 'Huánuco', lat: -9.9306, lng: -76.2422 }
    ]
  },
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
