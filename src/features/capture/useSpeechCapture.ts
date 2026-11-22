import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
  type ExpoSpeechRecognitionErrorEvent,
  type ExpoSpeechRecognitionOptions,
  type ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

/**
 * On-device (or platform) speech recognition for the capture flow (Figma 04.01 "Escutando").
 * Screens render this hook's state; the transcript is only text until the user confirms it in the Assistant flow.
 */
export type SpeechCaptureState = 'idle' | 'requesting' | 'listening' | 'stopped' | 'denied' | 'unavailable' | 'error';

export type SpeechCapture = {
  state: SpeechCaptureState;
  /** Final segments plus the current interim text, separated by spaces. */
  transcript: string;
  /** Input level normalized to 0..1. */
  volume: number;
  elapsedSeconds: number;
  error: string | null;
  start(): Promise<void>;
  /** Stops listening and resolves with the final transcript once the recognizer reports its last result (or after a short wait). */
  stop(): Promise<string>;
  /** Aborts listening and clears the transcript without processing a final result. */
  cancel(): void;
};

export const SPEECH_MAX_SECONDS = 60;
export const SPEECH_LANGUAGE = 'pt-BR';
export const SPEECH_NOTICE = 'O reconhecimento de voz do aparelho pode processar o áudio fora do celular.';

export const SPEECH_MESSAGES = {
  noSpeech: 'Não ouvi nada. Tente falar de novo.',
  denied: 'Permita o microfone e o reconhecimento de voz nas configurações do aparelho para falar com o Nomi. Você também pode digitar.',
  unavailable: 'O reconhecimento de voz do aparelho não está disponível.',
  generic: 'Não foi possível ouvir agora. Tente novamente.',
} as const;

const VOLUME_MIN = -2;
const VOLUME_MAX = 10;
/** How long stop() waits for the recognizer's last result before resolving with what it has. */
const STOP_WAIT_MS = 1500;

/** Maps the native volume range (about -2..10) to 0..1. */
export function normalizeVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, (value - VOLUME_MIN) / (VOLUME_MAX - VOLUME_MIN)));
}

export function joinTranscript(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(' ');
}

type ErrorOutcome = { state: 'denied' | 'unavailable' | 'error'; message: string };

export function speechErrorOutcome(code: ExpoSpeechRecognitionErrorCode): ErrorOutcome | null {
  switch (code) {
    case 'aborted':
      return null;
    case 'no-speech':
    case 'speech-timeout':
      return { state: 'error', message: SPEECH_MESSAGES.noSpeech };
    case 'not-allowed':
      return { state: 'denied', message: SPEECH_MESSAGES.denied };
    case 'network':
    case 'service-not-allowed':
    case 'language-not-supported':
      return { state: 'unavailable', message: SPEECH_MESSAGES.unavailable };
    default:
      return { state: 'error', message: SPEECH_MESSAGES.generic };
  }
}

export function useSpeechCapture(): SpeechCapture {
  const [state, setStateValue] = useState<SpeechCaptureState>('idle');
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef<SpeechCaptureState>('idle');
  const committedRef = useRef('');
  const interimRef = useRef('');
  const cancelledRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waitersRef = useRef<Array<() => void>>([]);
  const stopRef = useRef<() => Promise<string>>(async () => '');

  const update = useCallback((next: SpeechCaptureState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const currentText = useCallback(() => joinTranscript(committedRef.current, interimRef.current), []);

  const publish = useCallback(() => setTranscript(currentText()), [currentText]);

  const endTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const resolveWaiters = useCallback(() => {
    const waiters = waitersRef.current;
    waitersRef.current = [];
    waiters.forEach((settle) => settle());
  }, []);

  const flushInterim = useCallback(() => {
    committedRef.current = joinTranscript(committedRef.current, interimRef.current);
    interimRef.current = '';
    publish();
  }, [publish]);

  const beginTimer = useCallback(() => {
    endTimer();
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      const elapsed = Math.min(SPEECH_MAX_SECONDS, Math.floor((Date.now() - startedAtRef.current) / 1000));
      setElapsedSeconds(elapsed);
      if (elapsed >= SPEECH_MAX_SECONDS) void stopRef.current();
    }, 1000);
  }, [endTimer]);

  useSpeechRecognitionEvent('start', () => {
    if (cancelledRef.current) return;
    update('listening');
    beginTimer();
  });

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    if (cancelledRef.current) return;
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      committedRef.current = joinTranscript(committedRef.current, text);
      interimRef.current = '';
    } else {
      interimRef.current = text;
    }
    publish();
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (cancelledRef.current) return;
    setVolume(normalizeVolume(event.value));
  });

  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    if (cancelledRef.current) return;
    const outcome = speechErrorOutcome(event.error);
    if (!outcome) return;
    endTimer();
    flushInterim();
    setVolume(0);
    update(outcome.state);
    setError(outcome.message);
    resolveWaiters();
  });

  useSpeechRecognitionEvent('end', () => {
    endTimer();
    flushInterim();
    setVolume(0);
    if (stateRef.current === 'listening' || stateRef.current === 'requesting') update('stopped');
    resolveWaiters();
  });

  const start = useCallback(async () => {
    const current = stateRef.current;
    if (current === 'listening' || current === 'requesting') return;
    cancelledRef.current = false;
    committedRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setVolume(0);
    setElapsedSeconds(0);
    setError(null);
    update('requesting');
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        update('unavailable');
        setError(SPEECH_MESSAGES.unavailable);
        return;
      }
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (cancelledRef.current) return;
      if (!permission.granted) {
        update('denied');
        setError(SPEECH_MESSAGES.denied);
        return;
      }
      const options: ExpoSpeechRecognitionOptions = {
        lang: SPEECH_LANGUAGE,
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      };
      ExpoSpeechRecognitionModule.start(options);
    } catch {
      update('error');
      setError(SPEECH_MESSAGES.generic);
    }
  }, [update]);

  const stop = useCallback((): Promise<string> => {
    const current = stateRef.current;
    if (current !== 'listening' && current !== 'requesting') return Promise.resolve(currentText());
    endTimer();
    update('stopped');
    setVolume(0);
    return new Promise<string>((resolve) => {
      let settled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const settle = () => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        resolve(currentText());
      };
      timeout = setTimeout(settle, STOP_WAIT_MS);
      waitersRef.current.push(settle);
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        settle();
      }
    });
  }, [currentText, endTimer, update]);

  stopRef.current = stop;

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    endTimer();
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      /* the recognizer may already be idle */
    }
    committedRef.current = '';
    interimRef.current = '';
    setTranscript('');
    setVolume(0);
    setElapsedSeconds(0);
    setError(null);
    update('idle');
    resolveWaiters();
  }, [endTimer, resolveWaiters, update]);

  useEffect(() => () => {
    endTimer();
    if (stateRef.current === 'listening' || stateRef.current === 'requesting') {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        /* nothing to release */
      }
    }
  }, [endTimer]);

  return { state, transcript, volume, elapsedSeconds, error, start, stop, cancel };
}
