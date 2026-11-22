import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { File } from 'expo-file-system';
import { NomiButton, NomiText } from '@/components';
import { useAuth } from '@/features/auth/AuthProvider';
import { createIdempotencyKey } from '@/features/academic/infrastructure/AcademicClient';
import { AssistantTranscriptionClient } from './AssistantTranscriptionClient';

const recordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64_000 };
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function AwsVoiceCapture({ onTranscript }: { onTranscript: (text: string) => void }) {
  const auth = useAuth();
  const client = useMemo(() => {
    try { return new AssistantTranscriptionClient(auth.getAccessToken); }
    catch { return null; }
  }, [auth.getAccessToken]);
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string>();
  const recordingRef = useRef(false);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const transcriptionId = useRef<string | null>(null);
  const uploadAbort = useRef<AbortController | null>(null);

  useEffect(() => () => {
    cancelled.current = true;
    uploadAbort.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    if (recordingRef.current) void recorder.stop();
  }, [recorder]);

  const start = async () => {
    if (recordingRef.current || processing) return;
    setMessage(undefined);
    if (!client) { setMessage('O Nomi Assistant não está configurado. Use o cadastro por texto.'); return; }
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) { setMessage('Permita o microfone para gravar. Você também pode cadastrar por texto.'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      cancelled.current = false;
      recordingRef.current = true;
      startedAt.current = Date.now();
      setRecording(true);
      timer.current = setTimeout(() => { void finish(); }, 58_000);
    } catch { setMessage('Não foi possível iniciar a gravação. Tente novamente.'); }
  };

  const finish = async () => {
    if (!recordingRef.current || !client) return;
    recordingRef.current = false;
    if (timer.current) clearTimeout(timer.current);
    setRecording(false);
    const durationSeconds = Math.min(60, Math.max(0.1, (Date.now() - startedAt.current) / 1000));
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri || durationSeconds < 0.5) throw new Error('Grave pelo menos um segundo.');
      const file = new File(uri);
      setProcessing(true);
      setMessage('Enviando áudio para transcrição...');
      try {
        if (cancelled.current) return;
        uploadAbort.current = new AbortController();
        const audioId = await client.upload(file, durationSeconds, uploadAbort.current.signal);
        uploadAbort.current = null;
        if (cancelled.current) return;
        const job = await client.start(audioId, createIdempotencyKey());
        transcriptionId.current = job.id;
        if (cancelled.current) { await client.delete(job.id); return; }
        setMessage('Transcrevendo com Amazon Transcribe...');
        const deadline = Date.now() + 120_000;
        while (!cancelled.current && Date.now() < deadline) {
          const state = await client.get(job.id);
          if (state.status === 'succeeded' && state.text?.trim()) {
            setMessage(undefined);
            onTranscript(state.text.trim());
            return;
          }
          if (state.status === 'failed') throw new Error('Não foi possível entender a fala. Grave novamente ou digite.');
          if (state.status === 'cancelled') return;
          await delay(2500);
        }
        if (!cancelled.current) throw new Error('A transcrição está demorando. Tente novamente em instantes.');
      } finally { try { if (file.exists) file.delete(); } catch { /* the OS cache may already have removed it */ } }
    } catch (cause) {
      if (!cancelled.current) setMessage(cause instanceof Error ? cause.message : 'Falha na transcrição. Tente novamente.');
    } finally {
      setProcessing(false);
      uploadAbort.current = null;
      transcriptionId.current = null;
    }
  };

  const cancel = async () => {
    cancelled.current = true;
    uploadAbort.current?.abort();
    if (timer.current) clearTimeout(timer.current);
    if (recordingRef.current) {
      recordingRef.current = false;
      setRecording(false);
      try {
        await recorder.stop();
        if (recorder.uri) { const file = new File(recorder.uri); if (file.exists) file.delete(); }
        await setAudioModeAsync({ allowsRecording: false });
      } catch { /* local cancellation still clears the UI */ }
    }
    const id = transcriptionId.current;
    if (id && client) { try { await client.delete(id); } catch { /* server retention policy handles cleanup */ } }
    setMessage('Gravação cancelada.');
  };

  if (Platform.OS !== 'android') return null;
  return <View style={{ gap: 6 }}>
    {recording ? <>
      <NomiText variant="caption">Gravando · {Math.min(60, Math.ceil(recorderState.durationMillis / 1000))} s / 60 s</NomiText>
      <NomiButton label="Parar e transcrever" onPress={() => void finish()} />
      <NomiButton label="Cancelar gravação" variant="tertiary" onPress={() => void cancel()} />
    </> : processing ? <>
      <NomiText variant="caption">Processando áudio...</NomiText>
      <NomiButton label="Cancelar transcrição" variant="secondary" onPress={() => void cancel()} />
    </> : <NomiButton label="Gravar áudio" onPress={() => void start()} />}
    {message ? <NomiText variant="caption" tone="muted">{message}</NomiText> : null}
  </View>;
}
