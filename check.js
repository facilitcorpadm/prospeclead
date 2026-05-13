import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_URL';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'YOUR_KEY';

// Vou ler do .env se possível, senão pego do arquivo do cliente.
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) console.error(error);
  else {
    console.log("CHAVES DISPONÍVEIS NO LEAD MAIS RECENTE:");
    console.log(Object.keys(data[0]));
    console.log("\nVALORES DOS ULTIMOS 3 LEADS:");
    data.slice(0, 3).forEach(l => {
      console.log(`Nome: ${l.name || l.nome}, Medo: ${l.pain || l.pain_point || l.medo || l.description}, Praca: ${l.city || l.location || l.praca}`);
    });
  }
}
check();
