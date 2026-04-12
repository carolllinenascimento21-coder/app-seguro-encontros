# Emergency Alert System (Production Hardening)

## Environment variables

```bash
# Feature flags
ENABLE_PUSH=true
ENABLE_WHATSAPP=true
ENABLE_SMS=true

# Push (Firebase Cloud Messaging)
FCM_SERVER_KEY=...

# WhatsApp (Z-API)
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=...
ZAPI_INSTANCE_TOKEN=...
ZAPI_CLIENT_TOKEN=... # optional

# SMS fallback (Twilio)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## Channel priority

1. Push (Firebase; iOS payload includes APNS headers through FCM)
2. WhatsApp (Z-API)
3. SMS fallback (Twilio when WhatsApp is unavailable or fails)

## Abuse prevention

- Cooldown: max 1 emergency alert every 2 minutes per user.
- Max contacts per alert: 3 valid phone numbers.
- Structured event logging to `public.emergency_logs`.
