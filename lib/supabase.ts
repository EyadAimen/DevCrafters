import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://tqkccugnneulsopycjap.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxa2NjdWdubmV1bHNvcHljamFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MjkyNDQsImV4cCI6MjA3NzMwNTI0NH0.FkIzRcZlPyBNLXxXmC9Xacg0xXg2JdJCbYcZsJND__E'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})