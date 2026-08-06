export function appendTranscript(currentText: string, transcript: string) {
  const current = currentText.trimEnd()
  const spokenText = transcript.trim()

  if (!spokenText) return currentText
  if (!current) return spokenText

  const separator = /[.!?…,:;]$/.test(current) ? ' ' : '. '
  return `${current}${separator}${spokenText}`
}
