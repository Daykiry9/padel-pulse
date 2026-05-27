/**
 * Traduce errores técnicos de Postgres/Supabase a mensajes user-friendly
 * en español. Para errores de auth, ver auth-actions.ts (translator separado
 * porque manejan dominios distintos).
 */
export function translateDbError(message: string): string {
  // Triggers de validación (eligibility, etc.) ya vienen en español del SQL.
  // Los detectamos por palabras clave y los pasamos tal cual.
  const passthrough = [
    'Categoría no elegible',
    'Inscripción no permitida',
    'Suma insuficiente',
    'Mínimo',
    'Máximo',
    'Ya estás inscrito',
    'El equipo debe',
    'Las parejas',
  ];
  if (passthrough.some((p) => message.includes(p))) return message;

  const m = message.toLowerCase();

  // RLS — el usuario no tiene permiso (o falta info en su perfil)
  if (m.includes('row-level security') || m.includes('row level security')) {
    return 'No pudimos completar la inscripción. Verifica que tu perfil esté completo (con categoría y género) y que el torneo siga abierto. Si el problema sigue, escríbele al organizador.';
  }

  // Duplicate key — ya existe el registro
  if (m.includes('duplicate key') || m.includes('unique constraint')) {
    if (m.includes('tournament_registrations')) return 'Ya estás inscrito a este torneo.';
    if (m.includes('team_members')) return 'Ya eres miembro de este equipo.';
    if (m.includes('communities')) return 'Ese nombre o slug de comunidad ya existe. Prueba con otro.';
    if (m.includes('teams')) return 'Ese nombre de equipo ya existe en la comunidad.';
    return 'Este registro ya existe. Refresca la página para ver el estado actual.';
  }

  // FK — apuntas a algo que no existe
  if (m.includes('foreign key') || m.includes('violates foreign key constraint')) {
    return 'El equipo, torneo o comunidad ya no existe. Refresca la página.';
  }

  // Check constraints — datos fuera de rango
  if (m.includes('check constraint') || m.includes('violates check constraint')) {
    if (m.includes('valid_dates')) return 'Las fechas del torneo no son válidas (inicio antes que fin).';
    if (m.includes('valid_max_pairs') || m.includes('valid_max_teams')) {
      return 'El número de equipos debe ser par y mínimo 4.';
    }
    if (m.includes('courts_valid')) return 'Número de canchas debe estar entre 1 y 16.';
    if (m.includes('registration_modality')) return 'Modalidad de inscripción incompleta. Faltan los jugadores o el equipo.';
    if (m.includes('distinct_players')) return 'Los dos jugadores deben ser personas distintas.';
    if (m.includes('distinct_registrations')) return 'Una pareja no puede jugar contra sí misma.';
    // Perfil (onboarding) — campos con formato/rango específico.
    if (m.includes('phone_format')) {
      return 'Teléfono inválido: 7 a 20 caracteres, solo números, espacios y + ( ) -.';
    }
    if (m.includes('birthdate_reasonable')) {
      return 'Fecha de nacimiento inválida: revisá el año (debés tener al menos 5 años).';
    }
    if (m.includes('playing_since_reasonable')) {
      return 'El año desde que juegas no es válido (debe estar entre 1990 y el año actual).';
    }
    if (m.includes('instagram_handle_format')) {
      return 'Instagram inválido: solo letras, números, punto y guion bajo (sin @ ni espacios).';
    }
    return 'Algún dato no cumple el formato esperado. Revisá los campos marcados.';
  }

  // NOT NULL
  if (m.includes('null value in column') || m.includes('not-null constraint')) {
    return 'Falta llenar un campo obligatorio.';
  }

  // Permission denied (RLS-adjacent)
  if (m.includes('permission denied')) {
    return 'No tienes permisos para esta acción. Solo el organizador del torneo puede hacer cambios aquí.';
  }

  // Timeout / connection
  if (m.includes('timeout') || m.includes('connection') || m.includes('econnreset')) {
    return 'La conexión se cayó. Intenta de nuevo en un momento.';
  }

  // Default genérico — sin filtrar mensaje técnico
  return 'No pudimos completar la acción. Si vuelve a pasar, escríbele al organizador.';
}
