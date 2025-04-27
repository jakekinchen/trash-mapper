import { supabase } from './supabaseClient';

export async function getMyReports() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    throw new Error('User not authenticated.');
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user reports:', error);
    throw error;
  }

  // Assuming the report type includes all fields fetched
  // You might need to define a Report type in types/index.ts
  return data;
}

export async function getAllPollutionReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pollution reports:', error);
    throw error;
  }

  return data;
} 