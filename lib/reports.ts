import { supabase } from './supabaseClient';

// Define the Report type based on expected Supabase data
interface Report {
  id: string;
  user_id: string;
  geom: string; // WKB format
  severity: number;
  created_at: string;
  image_url: string;
  cleaned_up: boolean;
  is_valid_environment?: boolean; // Make optional to match potential schema
}

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

  // Filter out reports with is_valid_environment === false
  const filteredData = Array.isArray(data)
    ? data.filter((report: Report) => report.is_valid_environment !== false)
    : [];

  return filteredData;
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