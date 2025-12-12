import { criarCliente } de '@supabase/supabase-js'

const subaseUrl = processo.ambiente.NEXT_PUBLIC_SUPABASE_URL!
const subaseAnonKey = processo.ambiente.PRÓXIMA_CHAVE_ANON_SUPABASE_PÚBLICA!

exportar constante supabase = criarCliente(subaseUrl, subaseAnonKey)
