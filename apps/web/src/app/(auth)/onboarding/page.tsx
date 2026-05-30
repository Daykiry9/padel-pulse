import { redirect } from 'next/navigation';

// El onboarding obligatorio se eliminó: causaba loops cuando faltaban campos
// opcionales (skill_category, phone, etc.). Mantenemos esta ruta como redirect
// para que bookmarks viejos sigan funcionando.
export default async function OnboardingRedirect() {
  redirect('/app');
}
