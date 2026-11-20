import type { ThemePreference } from '@/theme/tokens';

/**
 * Dados simulados para a composição visual da seção 09 (Perfil e preferências).
 * Este arquivo é explicitamente identificado como simulação local e não substitui
 * a integração HTTP com os serviços Academic (GET/PATCH /me) e Notifications
 * (GET/PUT /api/v1/notification-preferences).
 */
export const IS_SIMULATED_PROFILE_DATA = true;

export type SimulatedProfileData = {
  id: string;
  displayName: string;
  email: string;
  courseLabel: string;
  termLabel: string;
  locale: string;
  localeLabel: string;
  timeZone: string;
  theme: ThemePreference;
  version: number;
  etag: string;
};

export const SIMULATED_PROFILE: SimulatedProfileData = {
  id: 'simulated-user-01',
  displayName: 'Willian',
  email: 'willian@universidade.edu',
  courseLabel: 'Engenharia de Software',
  termLabel: 'Semestre 2026.2',
  locale: 'pt-BR',
  localeLabel: 'Português (Brasil)',
  timeZone: 'America/Sao_Paulo',
  theme: 'system',
  version: 1,
  etag: '"1"',
};

export type AppearanceOptionItem = {
  key: ThemePreference;
  eyebrow: string;
  title: string;
  description: string;
};

export const APPEARANCE_OPTIONS: readonly AppearanceOptionItem[] = [
  {
    key: 'light',
    eyebrow: '01',
    title: 'Claro',
    description: 'Fundos suaves, contraste lilás',
  },
  {
    key: 'dark',
    eyebrow: '02',
    title: 'Escuro',
    description: 'Tons profundos, luz delicada',
  },
  {
    key: 'system',
    eyebrow: '03',
    title: 'Acompanhar o sistema',
    description: 'Segue a preferência do dispositivo',
  },
] as const;

export type StaticCardItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
};

export const PRIVACY_ITEMS: readonly StaticCardItem[] = [
  {
    id: 'microphone',
    eyebrow: 'CAPTURA',
    title: 'Microfone sob seu controle',
    description: 'A gravação só começa quando você toca.',
  },
  {
    id: 'sharing',
    eyebrow: 'COMPARTILHAMENTO',
    title: 'Privado por padrão',
    description: 'Você confirma cada envio ao grupo.',
  },
  {
    id: 'data-portability',
    eyebrow: 'CONTA',
    title: 'Exportar ou excluir seus dados',
    description: 'Consulte e gerencie suas informações (informativo · depende da TEC-008).',
  },
] as const;

export const SIMULATED_DEVICES: readonly StaticCardItem[] = [
  {
    id: 'android-phone',
    eyebrow: 'CONECTADO · DADOS SIMULADOS',
    title: 'Android de Willian',
    description: 'Última sincronização · agora (com.nomi.app)',
  },
  {
    id: 'wear-os-watch',
    eyebrow: 'WEAR OS · DADOS SIMULADOS',
    title: 'Nomi Quick',
    description: 'Toque, fale e confirme no pulso (integração Data Layer pendente)',
  },
] as const;

export type SimulatedReminderSummary = {
  enabledLabel: string;
  systemPermissionLabel: string;
  leadTimeLabel: string;
  dateOnlyTimeLabel: string;
};

export const SIMULATED_REMINDERS: SimulatedReminderSummary = {
  enabledLabel: 'Desativados (padrão inicial · dados simulados)',
  systemPermissionLabel: 'Gerenciada no sistema · abrir configurações do aparelho',
  leadTimeLabel: '30 minutos antes',
  dateOnlyTimeLabel: 'Às 09:00 no seu fuso',
};
