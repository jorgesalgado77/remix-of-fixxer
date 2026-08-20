
import { supabaseExternal } from "./src/lib/supabaseExternal.ts";

async function check() {
  const { data, error } = await supabaseExternal
    .from("profiles")
    .select("*")
    .limit(1);
  
  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log("Columns in profiles:", Object.keys(data[0]));
  } else {
    console.log("No data in profiles table to check columns.");
  }
}

check();
