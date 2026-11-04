// EXPO_PUBLIC values are embedded in the app; never put secrets here.
export const environment = {
  academicApiUrl: process.env.EXPO_PUBLIC_ACADEMIC_API_URL,
  assistantApiUrl: process.env.EXPO_PUBLIC_ASSISTANT_API_URL,
  notificationsApiUrl: process.env.EXPO_PUBLIC_NOTIFICATIONS_API_URL,
} as const;
