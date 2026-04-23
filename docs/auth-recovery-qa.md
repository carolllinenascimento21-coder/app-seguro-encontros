# QA de Recuperação de Senha (Confia+)

Este roteiro foi criado para evitar regressões no fluxo “Esqueci minha senha” e gerar evidência visual consistente.

## Pré-requisitos

1. Supabase com template de **Reset Password** em português.
2. Redirect URLs cadastradas:
   - `https://www.confiamais.net/auth/recovery`
   - `https://www.confiamais.net/auth/recovery/complete`
   - `https://www.confiamais.net/update-password`
3. Aplicação deployada no ambiente que será validado.

## Smoke test técnico (sem e-mail)

Com a aplicação rodando localmente:

```bash
npm run test:auth-recovery-routing
```

Esse teste valida redirects críticos para evitar o problema de cair no login em links de recovery.

## Checklist funcional (com e-mail real)

1. Acesse `/login` e clique em **Esqueci minha senha**.
2. Envie o e-mail de recuperação.
3. Abra o e-mail recebido e confirme idioma em português.
4. Clique no link, confirme em **Continuar redefinição** e valide que cai em `/update-password`.
5. Defina nova senha e confirme redirecionamento final.
6. Faça login com a nova senha.

## Evidências (screenshots obrigatórios)

Salvar screenshots com timestamp no nome do arquivo:

1. `01-email-reset-ptbr.png` (template em português)
2. `02-update-password-page.png` (link abre tela correta)
3. `03-password-updated-success.png` (sucesso e redirecionamento)

## Cenários de erro

1. Reabrir o mesmo link de reset e confirmar mensagem de expirado/inválido em `/update-password`.
2. Confirmar que não ocorre redirect para `/login` no fluxo de recovery com erro do provider.

## Recomendação de template (anti-prefetch de scanner de e-mail)

Se o link expirar instantaneamente por scanners automáticos de caixa de entrada, use no template de e-mail um link para a página de confirmação intermediária:

`https://www.confiamais.net/auth/recovery?token_hash={{ .TokenHash }}&type=recovery`
