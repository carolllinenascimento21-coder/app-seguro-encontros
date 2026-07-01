# Entrada sem cadastro com Supabase Anonymous Sign-In

Para que o botão **Entrar sem cadastro** funcione, habilite Anonymous Sign-Ins no painel do Supabase:

1. Abra o projeto no Supabase Dashboard.
2. Acesse **Authentication** > **Sign In / Providers**.
3. Abra **Anonymous Sign-Ins**.
4. Ative **Enable anonymous sign-ins** e salve.

## RLS / policies

Usuárias anônimas entram com sessão Supabase e role `authenticated`. Não desative RLS e não torne tabelas públicas. Se consulta ou cadastro/avaliação falharem por policy, ajuste somente as policies necessárias para permitir a role `authenticated`, incluindo usuários anônimos, nas operações de lançamento:

- `male_profiles`: leitura para consulta; insert mínimo quando a avaliação precisar criar o perfil avaliado.
- `male_profile_identifiers` / `profile_identifiers`: leitura/insert mínimo para resolução por identificadores, se o fluxo usar essas tabelas via cliente.
- `avaliacoes`: insert para a própria usuária autenticada/anônima; não liberar update/delete amplo para anônimas.
- `consultas`: insert vinculado a `auth.uid()`, se o registro de consulta for feito por policy em vez de service role.

Recursos permanentes, como histórico, edição/recuperação de avaliações e áreas administrativas, devem continuar exigindo conta permanente.
