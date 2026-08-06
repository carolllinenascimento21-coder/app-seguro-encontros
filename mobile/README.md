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

## Transcrição de voz nativa

A tela de avaliação usa `expo-speech-recognition`, que contém código nativo. Depois de instalar as
dependências, use um development build (não o Expo Go) para validar microfone e reconhecimento:

```bash
npx expo install expo-speech-recognition@2.1.1
npx eas-cli build --platform android --profile development
npx expo start --dev-client
```

Alterações nas permissões ou no plugin exigem uma nova build. Para distribuir a funcionalidade,
gere e publique novos builds Android e iOS; uma atualização apenas Web/OTA não adiciona o módulo
nativo à versão já instalada nas lojas.

## Build com EAS
```bash
npm install -g eas-cli
eas login
eas build --platform android --profile production
```
