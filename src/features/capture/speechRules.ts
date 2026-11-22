// Pure speech-capture rules (no native imports), shared by useSpeechCapture and tests.

/** Silence after speech that ends the capture automatically (the user stopped talking). */
export const SPEECH_SILENCE_MS = 2500;

/** True when there is captured text and nothing was heard for `silenceMs`. */
export function shouldEndOnSilence(hasText: boolean, lastSpeechAt: number, now: number, silenceMs = SPEECH_SILENCE_MS): boolean {
  return hasText && lastSpeechAt > 0 && now - lastSpeechAt >= silenceMs;
}
