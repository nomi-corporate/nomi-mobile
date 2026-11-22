import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NomiAvatarPlaceholder } from '@/components/brand/NomiAvatarPlaceholder';
import { NomiCard } from '@/components/ui/NomiCard';
import { NomiTabIcon, type NomiTabIconName } from '@/components/ui/NomiTabIcon';
import { NomiText } from '@/components/ui/NomiText';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiThemeOptions } from '@/components/ui/NomiThemeOptions';
import { useProfile } from '@/features/profile/ProfileProvider';

type MenuLinkProps = { title: string; detail: string; icon: NomiTabIconName; href?: '/agenda' | '/groups' | '/menu/subjects' | '/menu/professors' | '/menu/profile'; disabled?: boolean };

export default function MenuScreen() {
  const { colorScheme } = useNomiTheme();
  const insets = useSafeAreaInsets();
  const colors = palettes[colorScheme];
  const { profile } = useProfile();
  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingTop: Math.max(spacing.lg, insets.top + spacing.sm), paddingBottom: Math.max(112, insets.bottom + 80) }]}>
    <NomiText accessibilityRole="header" variant="display">Menu</NomiText>

    <Link href="/menu/profile" asChild>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil e conta">
        <NomiCard style={[styles.account, { backgroundColor: colors.tint, borderColor: colors.tint }]}>
          <NomiAvatarPlaceholder />
          <View style={styles.accountCopy}>
            <NomiText variant="heading">{profile?.displayName ?? 'Sua conta'}</NomiText>
            <NomiText variant="caption" tone="muted">Nomi Identity · Ver perfil</NomiText>
          </View>
          <NomiText variant="heading" tone="muted">›</NomiText>
        </NomiCard>
      </Pressable>
    </Link>

    <NomiText variant="label" tone="muted" style={styles.sectionTitle}>SUA VIDA ACADÊMICA</NomiText>
    <View style={styles.grid}>
      <MenuLink title="Agenda" detail="Aulas e prazos" icon="calendar" href="/agenda" />
      <MenuLink title="Matérias" detail="Seu semestre" icon="book" href="/menu/subjects" />
      <MenuLink title="Professores" detail="Contatos e matérias" icon="book" href="/menu/professors" />
      <MenuLink title="Grupos" detail="Estude com sua turma" icon="group" href="/groups" />
      <MenuLink title="Anotações" detail="Disponibilidade pendente" icon="note" disabled />
    </View>

    <NomiText variant="label" tone="muted" style={styles.sectionTitle}>PREFERÊNCIAS</NomiText>
    <NomiCard style={styles.preferences}>
      <View style={styles.preferenceHeader}>
        <NomiText variant="heading">Aparência</NomiText>
        <NomiText variant="caption" tone="muted">Tema do aplicativo</NomiText>
      </View>
      <NomiThemeOptions />
    </NomiCard>

    <Link href="/menu/profile" asChild>
      <Pressable accessibilityRole="button">
        <NomiCard style={styles.preferenceRow}>
          <NomiTabIcon name="menu" color={colors.accent} />
          <View style={styles.accountCopy}>
            <NomiText variant="label">Privacidade e conta</NomiText>
            <NomiText variant="caption" tone="muted">Gerenciar sessão e sair</NomiText>
          </View>
          <NomiText variant="heading" tone="muted">›</NomiText>
        </NomiCard>
      </Pressable>
    </Link>
  </ScrollView>;
}

function MenuLink({ title, detail, icon, href, disabled = false }: MenuLinkProps) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const content = <NomiCard style={[styles.tile, disabled && styles.disabledTile]}>
    <View style={[styles.tileIcon, { backgroundColor: colors.tint }]}>
      <NomiTabIcon name={icon} color={colors.accent} />
    </View>
    <NomiText variant="label">{title}</NomiText>
    <NomiText variant="caption" tone="muted">{disabled ? 'Em implementação' : detail}</NomiText>
  </NomiCard>;

  if (disabled || !href) return <View
    style={styles.tileSlot}
    accessible
    accessibilityRole="text"
    accessibilityLabel={`${title}. ${detail}`}
    accessibilityState={{ disabled: true }}
  >{content}</View>;
  return <Link href={href} asChild><Pressable accessibilityRole="button" style={styles.tileSlot}>{content}</Pressable></Link>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 112, gap: spacing.md },
  account: { minHeight: 88, padding: 12, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1 },
  accountCopy: { flex: 1, gap: spacing.xs },
  sectionTitle: { marginTop: spacing.sm, letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tileSlot: { width: '48%', flexGrow: 1 },
  tile: { minHeight: 105, justifyContent: 'center', gap: spacing.xs, borderRadius: 22 },
  disabledTile: { opacity: 0.58 },
  tileIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 2 },
  preferences: { gap: spacing.md },
  preferenceHeader: { gap: spacing.xs },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64 },
});
