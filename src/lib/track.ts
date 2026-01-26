export async function trackEvent(
  event: string,
  metadata?: Record<string, any>
) {
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, metadata }),
    })
  } catch {
    // analytics NUNCA pode quebrar UX
  }
}
