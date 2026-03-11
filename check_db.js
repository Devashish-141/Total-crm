
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking tables...');

    const tablesToCheck = ['customers', 'leads', 'custom_field_definitions', 'audit_logs'];

    for (const table of tablesToCheck) {
        const { data, error } = await supabase.from(table).select('count');
        if (error) {
            console.log(`${table}: MISSING or ERROR (${error.message})`);
        } else {
            console.log(`${table}: EXISTS`);
        }
    }
}

check();
