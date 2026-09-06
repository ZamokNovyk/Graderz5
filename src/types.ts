export type NavTab = 'home' | 'herramientas' | 'perfil';

export type SearchCategory = 'todos' | 'personajes' | 'profesores' | 'alumnos' | 'instituciones' | 'materias';

export type ActitudType = 'conozco' | 'fan' | 'simp' | 'hater';

export type UserGender = 'masculino' | 'femenino' | 'otro' | 'no_especificado';

export interface PersonajeActitud {
  id: string;
  personaje_slug: string;
  user_uid: string;
  user_name: string;
  actitud: ActitudType;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:mm:ss
  is_anonymous: boolean;
  user_gender?: string;
  user_nationality?: string;
  personaje_gender?: string;
  personaje_nationality?: string;
  created_at: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  category: 'personaje' | 'profesor' | 'alumno' | 'institucion' | 'materia';
  institution: string;
  rating: number;
  votesCount: number;
  badge?: string;
  avatar?: string;
  rank?: number;
  slug?: string;
}

export interface PersonajeFamiliar {
  wikidataId: string;
  name: string;
  relationship: 'padre' | 'madre' | 'hermano' | 'hijo' | 'conyuge' | 'familiar';
  label: string;
}

export interface Personaje {
  id: string;
  slug: string;
  nombre: string;
  creator_uid: string;
  creator_name?: string;
  image_url: string;
  birth_date?: string;
  death_date?: string;
  birth_place?: string;
  height?: string;
  weight?: string;
  occupation?: string;
  occupations?: string[];
  parents?: string[];
  siblings?: string[];
  children?: string[];
  spouse?: string;
  partner?: string;
  relatives?: PersonajeFamiliar[];
  extract?: string;
  wikidata_id?: string;
  wikipedia_url?: string;
  gender?: string;
  nationality?: string;
  count_conozco?: number;
  count_fan?: number;
  count_simp?: number;
  count_hater?: number;
  rating: number;
  votes_count: number;
  stars_1?: number;
  stars_2?: number;
  stars_3?: number;
  stars_4?: number;
  stars_5?: number;
  reviews_count?: number;
  created_at: string;
}

export interface PersonajeResena {
  id: string; // 'res_' || personaje_slug || '_' || user_uid
  personaje_slug: string;
  personaje_nombre?: string;
  user_uid: string;
  user_name: string;
  user_gender?: string;
  user_nationality?: string;
  is_anonymous: boolean;
  registered_with: 'google' | 'anonymous';
  review_text?: string;
  stars: number;
  created_at: string;
}

export interface CountryDemographics {
  total: number;
  m: number; // masculino / hombres
  f: number; // femenino / mujeres
  o: number; // otro o no especificado
}

export interface PersonajeWorldRecord {
  id: string; // e.g. 'lalisa.manobal_fan'
  personaje_slug: string;
  actitud: 'fan' | 'simp' | 'hater' | 'conozco';
  paises: Record<string, number | CountryDemographics>; // e.g. { "Perú": { total: 5, m: 4, f: 1 } } o { "Perú": 5 }
  total: number;
  updated_at?: string;
}

declare module 'globe.gl';


