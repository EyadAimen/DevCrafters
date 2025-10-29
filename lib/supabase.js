import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://ajnfsrimxcjincckfovl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbmZzcmlteGNqaW5jY2tmb3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExMTc3OTAsImV4cCI6MjA3NjY5Mzc5MH0.mWPUYtng93yxvQbWFHAgZMS20lSRgCT_iwiGzKVfUEk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})