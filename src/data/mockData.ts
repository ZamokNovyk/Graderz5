import { SearchResultItem } from '../types';

export const mockSearchResults: SearchResultItem[] = [
  {
    id: '1',
    name: 'Dr. Alejandro Morales',
    category: 'profesor',
    institution: 'Facultad de Ingeniería',
    rating: 4.9,
    votesCount: 342,
    badge: 'Top 1 % Profesor',
    rank: 1
  },
  {
    id: '2',
    name: 'Valeria Sotomayor',
    category: 'alumno',
    institution: 'Facultad de Medicina',
    rating: 4.8,
    votesCount: 189,
    badge: 'Líder Estudiantil',
    rank: 2
  },
  {
    id: '3',
    name: 'Campus Central Tecnológico',
    category: 'institucion',
    institution: 'Sede Principal',
    rating: 4.7,
    votesCount: 1250,
    badge: 'Campus Destacado'
  },
  {
    id: '4',
    name: 'Prof. Carmen Delgado',
    category: 'profesor',
    institution: 'Departamento de Matemáticas',
    rating: 4.6,
    votesCount: 215,
    badge: 'Favorito del Semestre'
  },
  {
    id: '5',
    name: 'Cálculo Multivariable II',
    category: 'materia',
    institution: 'Ciencias Básicas',
    rating: 4.5,
    votesCount: 420,
    badge: 'Mayor Dificultad'
  },
  {
    id: '6',
    name: 'Mateo Fernández',
    category: 'alumno',
    institution: 'Arquitectura & Diseño',
    rating: 4.9,
    votesCount: 95,
    badge: 'Representante'
  }
];

export const quickCampusTags = [
  '🔥 Top Profesores',
  '⚡ Ranking de Popularidad',
  '🏆 Alumnos Destacados',
  '🏛️ Facultades',
  '⭐ Evaluaciones 5.0'
];
