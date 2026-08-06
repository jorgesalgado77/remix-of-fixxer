import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUser() {
  const userId = '26a6cec6-973a-4c7c-9276-2f28524ae087';
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, lat, lng, city, state')
    .eq('id', userId)
    .maybeSingle();
    
  if (error) {
    console.error('Error fetching profile:', error);
  } else {
    console.log('Profile Data:', JSON.stringify(profile, null, 2));
  }
}

checkUser();
