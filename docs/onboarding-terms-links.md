# Onboarding — smoke checklist para links de termos

Objetivo: validar que os links **Termo de Uso** e **Política de Privacidade** da rota `/onboarding/aceitar-termos` estão sempre acessíveis, com destino correto e sem bloqueio de clique.

## Checklist rápido (manual)

1. Abrir `/onboarding/aceitar-termos?next=/signup` em viewport mobile (390x844) e desktop.
2. Validar presença do texto: **"Ao continuar, você concorda com..."**.
3. Confirmar foco via teclado (`Tab`) nos links:
   - `Termo de Uso`
   - `Política de Privacidade`
   - botões `Ver Termos` e `Ver Política`
4. Verificar que todos os 4 elementos têm `href` válido e abrem em nova aba (`target="_blank"`).
5. Clicar `Termo de Uso` e confirmar abertura de `/termos`.
6. Clicar `Política de Privacidade` e confirmar abertura de `/privacidade`.
7. Confirmar que a aba original continua em `/onboarding/aceitar-termos?next=/signup` (contexto preservado).
8. Marcar ambos checkboxes e clicar **Aceitar e continuar**.
9. Confirmar redirecionamento para `next` (ex.: `/signup`) e ausência de erro.
10. Repetir com `next` ausente e confirmar fallback para `/signup`.

## Observações de robustez

- Os links devem estar em elementos `<a>` de fato (via `next/link`), sem `preventDefault`.
- Não usar overlays/camadas com `pointer-events: none` sobre a área de termos.
- Em caso de regressão visual, anexar screenshot mobile e desktop ao PR.
