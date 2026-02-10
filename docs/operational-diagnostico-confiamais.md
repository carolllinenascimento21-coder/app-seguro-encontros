# Diagnóstico técnico — Confia+ (confiamais.net)

## Escopo e limitações desta varredura

Esta análise foi feita a partir do código-fonte e das migrações versionadas neste repositório.

**Limitação do ambiente atual:** não foi possível autenticar/consultar diretamente o projeto remoto no Supabase e na Vercel (CLIs `supabase`, `vercel` e `gh` não estão instaladas neste ambiente e não há credenciais expostas), então os itens que dependem de leitura em produção foram transformados em **queries/comandos de validação executáveis**.

---

## 1) Inventário completo de uso do Supabase no código

### Tabelas referenciadas no app

1. `profiles`
2. `avaliacoes`
3. `avaliados`
4. `male_profiles`
5. `consultas`
6. `user_credits`
7. `plans`
8. `analytics_events`
9. `emergency_contacts`
10. `contatos_emergencia`
11. `historico_avaliacoes`
12. `avatars` *(em uso de Storage, não tabela)*
13. `selfie-verifications` *(em uso de Storage, não tabela)*

### RPCs referenciadas

1. `consume_query`
2. `consume_credit`
3. `add_profile_credits_with_transaction`
4. `get_avaliacao_entitlements`

### Buckets referenciados

1. `avatars`
2. `selfie-verifications`

---

## 2) Comparação com estrutura atual esperada (com base em código + migrations)

> Como não houve acesso direto ao banco remoto, esta seção aponta **riscos de quebra** e **incompatibilidades detectáveis no repositório**.

### Divergências de alto risco

1. **Nome de tabela inconsistente para contatos de emergência**
   - Parte do app usa `emergency_contacts`.
   - Outra parte usa `contatos_emergencia`.
   - Se uma das duas não existir em produção, haverá erro de runtime na tela correspondente.

2. **Dependência de objetos sem migração explícita neste repo**
   - Não há criação explícita versionada neste repositório para: `male_profiles`, `avaliados`, `plans`, `analytics_events`, `user_credits`, `historico_avaliacoes`, `emergency_contacts`, `contatos_emergencia`.
   - Isso indica possível dependência de schema legado/manual fora das migrations atuais.

3. **Rota potencialmente quebrada por caminho anômalo**
   - Existe arquivo em `src/app/api/src/app/api/aceitar-termos/route.ts`, sugerindo rota deslocada/duplicada e potencial endpoint não exposto no path esperado.

---

## 3) RLS das tabelas usadas no frontend

### Tabelas com políticas claramente tratadas nas migrations

- `profiles`: várias migrations reforçam RLS e políticas de owner/service role.
- `avaliacoes`: políticas e hardening de inserção com entitlements/créditos.
- `consultas`: há create table + políticas versionadas.

### Tabelas usadas no frontend/API sem garantia de policy neste repo

- `male_profiles`
- `avaliados`
- `emergency_contacts`
- `contatos_emergencia`
- `historico_avaliacoes`
- `user_credits`
- `plans`
- `analytics_events`

> Para essas tabelas, sem inspeção remota (`pg_policies`) não é possível confirmar se a RLS está ativa e correta em produção.

---

## 4) Trigger de criação automática de profile pós `auth.users`

As migrations contêm função/trigger `on_auth_user_created` (drop/create), portanto a automação **está prevista** no código versionado.

---

## 5) Verificação de usuários sem profile correspondente

Sem acesso ao banco remoto, não foi possível medir a situação atual. A query de verificação e remediação está no SQL de correção (`supabase/scripts/repair_confiamais.sql`).

---

## 6) Validação de variáveis de ambiente da Vercel

Sem acesso ao painel/CLI autenticado da Vercel, não foi possível ler os valores reais.

### Variáveis obrigatórias identificadas no código

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## 7) Logs Supabase e Vercel

Sem autenticação nas plataformas, não foi possível coletar logs em tempo real neste ambiente.

---

## 8a) Diagnóstico técnico consolidado

1. **Maior risco imediato:** mismatch entre `emergency_contacts` vs `contatos_emergencia`.
2. **Maior risco estrutural:** parte do schema usado no app não está completamente representada nas migrations do repo (drift entre código e banco real).
3. **Maior risco operacional:** ausência de validação remota de RLS/policies/trigger/usuários órfãos pode manter o app parcialmente indisponível mesmo com deploy de frontend correto.
4. **Rota de aceite de termos parece fora do lugar** e deve ser revisada para garantir endpoint efetivo no path esperado.

---

## 8b) SQL de correção

Arquivo: `supabase/scripts/repair_confiamais.sql`

Inclui:
- criação idempotente de estruturas mínimas ausentes;
- políticas RLS essenciais para as tabelas usadas pelo frontend;
- trigger de criação de profile em `auth.users`;
- backfill de profiles para usuários sem linha correspondente;
- camada de compatibilidade entre `contatos_emergencia` e `emergency_contacts`.

---

## 8c) Checklist final de validação (produção)

1. Executar `repair_confiamais.sql` no projeto Supabase correto.
2. Confirmar existência de todas as tabelas/rpcs/buckets usados no código.
3. Validar `pg_policies` para cada tabela consumida pelo frontend/API.
4. Testar criação de usuário novo e confirmar profile auto-criado.
5. Rodar query de usuários sem profile e confirmar resultado 0.
6. Revisar variáveis de ambiente em Vercel (produção/preview/development).
7. Testar logs de runtime (Vercel Functions + Supabase logs) durante:
   - login
   - onboarding selfie
   - criação/edição de avaliação
   - consulta reputação
   - atualização de perfil e contatos
8. Corrigir/normalizar endpoint de aceite de termos e retestar fluxo.
