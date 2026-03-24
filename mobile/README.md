# Confia+ Mobile (Expo)

## Requisitos
- Node 18+
- Expo CLI (`npx expo start`)

## Configuração
1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Preencha as variáveis:
   - `EXPO_PUBLIC_API_BASE_URL`
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Rodando localmente
```bash
npm install
npx expo start
```

## Build com EAS
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```
