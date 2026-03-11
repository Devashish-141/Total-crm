
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Fetching last 5 audit logs...');
    const { data, error } = await supabase.from('audit_logs').select('*').limit(5).order('created_at', { ascending: false });
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

check();
