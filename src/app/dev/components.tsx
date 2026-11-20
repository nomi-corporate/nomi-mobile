import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { Icon, type IconName } from '@/components/Icon';
import { MainNavBar, type NavTabKey } from '@/components/MainNavBar';
import { NavRow } from '@/components/NavRow';
import { OptionCard } from '@/components/OptionCard';
import { ProfileSummary } from '@/components/ProfileSummary';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionLabel } from '@/components/SectionLabel';
import { useNomiTheme } from '@/theme/ThemeProvider';
import { spacing, typography, type ThemePreference } from '@/theme/tokens';

const ICONS: readonly IconName[] = [
  'back',
  'bell',
  'home',
  'calendar',
  'group',
  'menu',
  'avatar',
  'chevronRight',
] as const;

export default function ComponentCatalogScreen() {
  const router = useRouter();
  const { colors, preference, setPreference, mode } = useNomiTheme();
  const [name, setName] = useState('Willian (simulado)');
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(preference);
  const [activeTab, setActiveTab] = useState<NavTabKey>('menu');

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  const handleSelectTheme = (next: ThemePreference) => {
    setSelectedTheme(next);
    setPreference(next);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Catálogo (dev)"
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          }
        }}
        showNotifications
        onNotificationsPress={() => {}}
      />

      <Text style={[styles.note, { color: colors.muted }]}>
        Rota exclusiva de desenvolvimento (__DEV__). Tema ativo: {mode} (preferência:{' '}
        {preference}).
      </Text>

      <SectionLabel>ALTERNAR TEMA</SectionLabel>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label="Claro"
            variant={preference === 'light' ? 'primary' : 'secondary'}
            onPress={() => handleSelectTheme('light')}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="Escuro"
            variant={preference === 'dark' ? 'primary' : 'secondary'}
            onPress={() => handleSelectTheme('dark')}
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="Sistema"
            variant={preference === 'system' ? 'primary' : 'secondary'}
            onPress={() => handleSelectTheme('system')}
          />
        </View>
      </View>

      <SectionLabel>PROFILE SUMMARY</SectionLabel>
      <ProfileSummary
        name="Willian"
        course="Engenharia de Software"
        term="Semestre 2026.2"
      />

      <SectionLabel>FIELD</SectionLabel>
      <Field label="NOME" value={name} onChangeText={setName} />
      <Field
        label="E-MAIL · SOMENTE LEITURA"
        value="willian@universidade.edu"
        readOnly
      />
      <Field
        label="FUSO HORÁRIO"
        value="Fuso inválido"
        error="Informe um identificador IANA válido (ex.: America/Sao_Paulo)."
        onChangeText={() => {}}
      />

      <SectionLabel>BUTTON</SectionLabel>
      <Button label="Primário (Salvar alterações)" variant="primary" onPress={() => {}} />
      <Button label="Secundário (Mudar aparência)" variant="secondary" onPress={() => {}} />
      <Button label="Carregando" variant="primary" loading onPress={() => {}} />
      <Button label="Desativado" variant="primary" disabled onPress={() => {}} />

      <SectionLabel>NAV ROW</SectionLabel>
      <NavRow
        title="Aparência"
        subtitle="Claro, escuro ou sistema"
        onPress={() => {}}
      />
      <NavRow
        title="Cancelar"
        subtitle="Voltar sem alterar os dados"
        onPress={() => {}}
      />

      <SectionLabel>OPTION CARD</SectionLabel>
      <OptionCard
        eyebrow="01"
        title="Claro"
        description="Fundos suaves, contraste lilás"
        selected={selectedTheme === 'light'}
        onPress={() => handleSelectTheme('light')}
      />
      <OptionCard
        eyebrow="02"
        title="Escuro"
        description="Tons profundos, luz delicada"
        selected={selectedTheme === 'dark'}
        onPress={() => handleSelectTheme('dark')}
      />
      <OptionCard
        eyebrow="03"
        title="Acompanhar o sistema"
        description="Segue a preferência do dispositivo"
        selected={selectedTheme === 'system'}
        onPress={() => handleSelectTheme('system')}
      />

      <SectionLabel>ICONS</SectionLabel>
      <View style={[styles.iconGrid, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
        {ICONS.map((iconName) => (
          <View key={iconName} style={styles.iconCell}>
            <Icon name={iconName} size={22} color={colors.accent} />
            <Text style={[styles.iconLabel, { color: colors.muted }]}>{iconName}</Text>
          </View>
        ))}
      </View>

      <SectionLabel>MAIN NAV BAR</SectionLabel>
      <MainNavBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    gap: spacing.blockGap,
  },
  note: {
    ...typography.caption,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 18,
    borderWidth: 2,
  },
  iconCell: {
    alignItems: 'center',
    gap: 4,
    minWidth: 68,
  },
  iconLabel: {
    ...typography.caption,
  },
});
