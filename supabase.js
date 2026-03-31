const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://rlnyofcslojmnfzlswhz.supabase.co',
  'sb_publishable_gKVzzTO5sfloRoMYxVoZzw_6A7qxk8W'
)

module.exports = supabase