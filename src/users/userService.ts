import { User } from 'firebase/auth';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  gender?: string;
  nationality?: string;
  createdAt?: string;
  lastLogin?: string;
}

/**
 * Guarda o actualiza el registro del usuario (UID) en Supabase cuando inicia sesión con Google via Firebase Auth.
 * 
 * @param user Usuario autenticado con Firebase Auth
 * @param extraData Opciones adicionales como sexo y nacionalidad
 */
export async function saveUserToSupabase(
  user: User,
  extraData?: { gender?: string; nationality?: string }
): Promise<{ success: boolean; source: 'supabase' | 'local'; data?: UserProfile; error?: string }> {
  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    provider: 'google',
    gender: extraData?.gender || 'no_especificado',
    nationality: extraData?.nationality || 'No especificada',
    lastLogin: new Date().toISOString()
  };

  // Guardar copia local de respaldo en el navegador
  try {
    const storedUsersJson = localStorage.getItem('graderz5_users') || '[]';
    const storedUsers: UserProfile[] = JSON.parse(storedUsersJson);
    const existingIndex = storedUsers.findIndex(u => u.uid === user.uid);
    if (existingIndex >= 0) {
      storedUsers[existingIndex] = { 
        ...storedUsers[existingIndex], 
        ...userProfile,
        gender: extraData?.gender || storedUsers[existingIndex].gender || 'no_especificado',
        nationality: extraData?.nationality || storedUsers[existingIndex].nationality || 'No especificada',
      };
    } else {
      storedUsers.push({ ...userProfile, createdAt: new Date().toISOString() });
    }
    localStorage.setItem('graderz5_users', JSON.stringify(storedUsers));
  } catch (e) {
    console.warn('Error al guardar respaldo local de usuario:', e);
  }

  // Intentar guardar en Supabase si el cliente está inicializado
  if (!supabase) {
    console.log('ℹ️ Supabase no está configurado con claves en .env. El usuario con UID (' + user.uid + ') se guardó en el estado local.');
    return { 
      success: true, 
      source: 'local', 
      data: userProfile, 
      error: 'Supabase no configurado en .env (guardado en caché local)' 
    };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          uid: user.uid,
          email: user.email,
          display_name: user.displayName,
          photo_url: user.photoURL,
          provider: 'google',
          gender: userProfile.gender,
          nationality: userProfile.nationality,
          last_login: new Date().toISOString(),
        },
        { onConflict: 'uid' }
      )
      .select();

    if (error) {
      console.warn('Aviso: No se pudo sincronizar usuario con Supabase (usando almacenamiento local):', error?.message || error);
      return { success: false, source: 'local', data: userProfile, error: error.message };
    }

    console.log('✅ Usuario registrado con éxito en tabla "users" de Supabase:', data);
    return { success: true, source: 'supabase', data: userProfile };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Aviso al conectar con Supabase (modo local activo):', message);
    return { success: false, source: 'local', data: userProfile, error: message };
  }
}

/**
 * Obtiene el perfil ampliado del usuario (incluyendo sexo y nacionalidad)
 */
export async function getUserProfileDetails(uid: string): Promise<UserProfile | null> {
  // 1. Probar en Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();

      if (!error && data) {
        return {
          uid: String(data.uid),
          email: data.email ? String(data.email) : null,
          displayName: data.display_name ? String(data.display_name) : null,
          photoURL: data.photo_url ? String(data.photo_url) : null,
          provider: data.provider ? String(data.provider) : 'google',
          gender: data.gender ? String(data.gender) : 'no_especificado',
          nationality: data.nationality ? String(data.nationality) : 'No especificada',
          createdAt: data.created_at ? String(data.created_at) : undefined,
          lastLogin: data.last_login ? String(data.last_login) : undefined,
        };
      }
    } catch (e) {
      console.warn('Error al obtener perfil desde Supabase:', e);
    }
  }

  // 2. Probar en caché local
  try {
    const storedUsersJson = localStorage.getItem('graderz5_users') || '[]';
    const storedUsers: UserProfile[] = JSON.parse(storedUsersJson);
    return storedUsers.find(u => u.uid === uid) || null;
  } catch {
    return null;
  }
}

/**
 * Verifica si un nombre de usuario ya está registrado por otro usuario.
 * @param username Nombre de usuario a comprobar
 * @param currentUid UID del usuario actual (para permitir su propio nombre)
 */
export async function checkUsernameAvailability(
  username: string, 
  currentUid: string
): Promise<{ isAvailable: boolean; message?: string }> {
  const cleanUsername = username.trim().toLowerCase();
  
  if (!cleanUsername) {
    return { isAvailable: false, message: 'El nombre de usuario no puede estar vacío.' };
  }
  if (cleanUsername.length < 3) {
    return { isAvailable: false, message: 'El nombre de usuario debe tener al menos 3 caracteres.' };
  }
  if (cleanUsername.length > 10) {
    return { isAvailable: false, message: 'El nombre de usuario no debe superar los 10 caracteres.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    return { isAvailable: false, message: 'Solo se permiten letras, números, guiones y guiones bajos.' };
  }

  // 1. Comprobación en almacenamiento local (caché / fallback)
  try {
    const storedUsersJson = localStorage.getItem('graderz5_users') || '[]';
    const storedUsers: UserProfile[] = JSON.parse(storedUsersJson);
    const existingUser = storedUsers.find(
      u => u.displayName && u.displayName.trim().toLowerCase() === cleanUsername && u.uid !== currentUid
    );
    if (existingUser) {
      return { isAvailable: false, message: 'Este nombre de usuario ya está ocupado.' };
    }
  } catch (e) {
    console.warn('Error al verificar disponibilidad local:', e);
  }

  // 2. Comprobación en Supabase (si está configurado)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('uid, display_name')
        .neq('uid', currentUid);

      if (!error && data) {
        const taken = data.some(
          (u: Record<string, unknown>) => 
            u.display_name && String(u.display_name).trim().toLowerCase() === cleanUsername
        );
        if (taken) {
          return { isAvailable: false, message: 'Este nombre de usuario ya está ocupado por otro usuario.' };
        }
      }
    } catch (err) {
      console.warn('Error al consultar nombres en Supabase:', err);
    }
  }

  return { isAvailable: true };
}

/**
 * Obtiene la lista de usuarios guardados localmente o en Supabase
 */
export async function getUsersList(): Promise<UserProfile[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) {
        return data.map((u: Record<string, unknown>) => ({
          uid: String(u.uid),
          email: u.email ? String(u.email) : null,
          displayName: u.display_name ? String(u.display_name) : null,
          photoURL: u.photo_url ? String(u.photo_url) : null,
          provider: u.provider ? String(u.provider) : 'google',
          createdAt: u.created_at ? String(u.created_at) : undefined,
          lastLogin: u.last_login ? String(u.last_login) : undefined,
        }));
      }
    } catch (e) {
      console.warn('Fallo al obtener usuarios desde Supabase, usando local:', e);
    }
  }

  try {
    const storedUsersJson = localStorage.getItem('graderz5_users') || '[]';
    return JSON.parse(storedUsersJson);
  } catch {
    return [];
  }
}
