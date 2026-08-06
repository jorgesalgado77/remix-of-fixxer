
import { supabaseExternal } from './src/lib/supabaseExternal.js';

async function checkUser() {
  const userId = '26a6cec6-973a-4c7c-9276-2f28524ae087';
  
  const { data: profile, error } = await supabaseExternal
    .from('profiles_public')
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
