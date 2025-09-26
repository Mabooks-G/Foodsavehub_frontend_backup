
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://qqwbssxbcnhlcbhuubwd.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxd2Jzc3hiY25obGNiaHV1YndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5NTgzMDgsImV4cCI6MjA3MzUzNDMwOH0.6aOKV_gfKF1LeoWvFjjeaszz66ms8UehmcBAT0w5Y-s"

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase