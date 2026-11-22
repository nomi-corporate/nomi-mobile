import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { NomiAppIcon } from '@/components/brand/NomiAppIcon';
import { NomiAvatarPlaceholder } from '@/components/brand/NomiAvatarPlaceholder';
import { NomiCompactMark } from '@/components/brand/NomiCompactMark';
import { NomiMascot } from '@/components/brand/NomiMascot';
import { NomiAgendaItem } from '@/components/ui/NomiAgendaItem';
import { NomiButton } from '@/components/ui/NomiButton';
import { NomiCard } from '@/components/ui/NomiCard';
import { NomiEmptyState } from '@/components/ui/NomiEmptyState';
import { NomiFeedback } from '@/components/ui/NomiFeedback';
import { NomiSubjectIcon } from '@/components/ui/NomiSubjectIcon';
import { NomiText } from '@/components/ui/NomiText';
import { NomiTextField } from '@/components/ui/NomiTextField';
import { mascotPalette, palettes } from '@/theme/tokens';
import { typography, type NomiTextVariant } from '@/theme/typography';
import { useNomiTheme, type NomiThemeMode } from '@/theme/NomiThemeProvider';

const mascotPoses = [
  ['greeting', 'Saudando'],
  ['attentive', 'Atento'],
  ['thinking', 'Pensando'],
  ['celebrating', 'Comemorando'],
  ['listening', 'Ouvindo'],
  ['explaining', 'Explicando'],
  ['sleeping', 'Dormindo'],
  ['face', 'Rosto'],
] as const;

const subjects = [
  ['calculo-matematica', 'Cálculo'],
  ['fisica', 'Física'],
  ['quimica', 'Química'],
  ['biologia', 'Biologia'],
  ['programacao', 'Programação'],
  ['engenharia-software', 'Engenharia de software'],
  ['portugues-literatura', 'Português'],
  ['historia', 'História'],
] as const;

const textVariants = Object.keys(typography) as NomiTextVariant[];
const tones = ['surface', 'tint', 'success', 'error'] as const;
const feedbackKinds = ['loading', 'empty', 'success', 'error'] as const;
const emptyKinds = ['note', 'calendar', 'book', 'users', 'bell', 'search'] as const;
const themeModes: Array<{ value: NomiThemeMode; label: string }> = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

export default function ComponentsGalleryScreen() {
  return __DEV__ ? <ComponentsGalleryContent /> : <Redirect href="/" />;
}

function ComponentsGalleryContent() {
  const { mode, colorScheme, setMode } = useNomiTheme();
  const dark = colorScheme === 'dark';
  const colors = palettes[dark ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.heading}>
            <NomiText variant="display">Galeria de componentes</NomiText>
            <NomiText variant="body" tone="muted">
              Prévia local do design system Nomi. Toque no botão para alternar o tema.
            </NomiText>
          </View>
          <View style={styles.themeModes} accessibilityLabel="Modo de cores">
            {themeModes.map((themeMode) => {
              const selected = mode === themeMode.value;
              return (
                <Pressable
                  key={themeMode.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setMode(themeMode.value)}
                  style={[styles.themeButton, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: colors.border }]}
                >
                  <NomiText variant="label" style={{ color: selected ? colors.onAccent : colors.text }}>{themeMode.label}</NomiText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Section title="Cores" subtitle="Tokens do tema atual">
          <View style={styles.grid}>
            {Object.entries(colors).map(([name, color]) => (
              <View key={name} style={[styles.swatch, { backgroundColor: color, borderColor: colors.border }]}>
                <NomiText variant="caption" style={{ color: name === 'accent' ? colors.onAccent : colors.text }}>
                  {name}
                </NomiText>
                <NomiText variant="caption" style={{ color: name === 'accent' ? colors.onAccent : colors.text }}>
                  {color}
                </NomiText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Cores de marca e mascote" subtitle="Variáveis de arte exportadas do Figma">
          <NomiCard>
            <View style={styles.brandColors}>
              {Object.entries(mascotPalette).map(([name, color]) => (
                <View key={name} style={styles.brandColor}>
                  <View style={[styles.colorSample, { backgroundColor: color, borderColor: colors.border }]} />
                  <View style={styles.colorLabel}>
                    <NomiText variant="caption">{name}</NomiText>
                    <NomiText variant="caption" tone="muted">{color}</NomiText>
                  </View>
                </View>
              ))}
            </View>
          </NomiCard>
        </Section>

        <Section title="Tipografia" subtitle="Fontes e estilos carregados no app">
          <NomiCard>
            <NomiText variant="title">Baloo 2 · títulos</NomiText>
            <NomiText variant="body">Nunito Sans · textos e campos</NomiText>
            <TypographyFontStatus />
            {textVariants.map((variant) => (
              <View key={variant} style={styles.typeRow}>
                <NomiText variant="caption" tone="muted" style={styles.typeName}>{variant}</NomiText>
                <NomiText variant={variant}>Aprender no seu ritmo</NomiText>
              </View>
            ))}
          </NomiCard>
        </Section>

        <Section title="Marca e ícones" subtitle="Símbolo compacto e ícone principal, exportados dos componentes atuais do Figma">
          <NomiCard>
            <View style={styles.brandIconPreview}>
              <View style={styles.brandIconItem}>
                <View style={styles.brandIconTile}><NomiCompactMark size={64} /></View>
                <NomiText variant="heading">Símbolo compacto</NomiText>
                <NomiText variant="caption" tone="muted">Três pintas · Figma 148:3216</NomiText>
              </View>
              <View style={styles.brandIconItem}>
                <View style={styles.brandIconTile}><NomiAppIcon size={112} /></View>
                <NomiText variant="heading">Ícone do app</NomiText>
                <NomiText variant="caption" tone="muted">Rosto frontal · Figma 148:2819</NomiText>
              </View>
            </View>
          </NomiCard>
        </Section>

        <Section title="Avatar sem foto" subtitle="Placeholder do perfil conforme o Figma (64 × 64)">
          <NomiCard>
            <View style={styles.avatarPreview}>
              <NomiAvatarPlaceholder />
              <NomiText variant="caption" tone="muted">Nomi · Avatar de fallback</NomiText>
            </View>
          </NomiCard>
        </Section>

        <Section title="Mascote" subtitle="Poses vetoriais estáticas exportadas do Figma">
          <View style={styles.grid}>
            {mascotPoses.map(([pose, label]) => (
              <NomiCard key={pose} padding={12} style={styles.mascotCard}>
                <NomiMascot pose={pose} size={112} />
                <NomiText variant="caption" tone="muted">{label}</NomiText>
              </NomiCard>
            ))}
          </View>
        </Section>

        <Section title="Botões" subtitle="Variantes e estados disponíveis">
          <NomiCard>
            <View style={styles.buttonGrid}>
              <NomiButton label="Primário" onPress={() => undefined} />
              <NomiButton label="Secundário" variant="secondary" onPress={() => undefined} />
              <NomiButton label="Terciário" variant="tertiary" onPress={() => undefined} />
              <NomiButton label="Desabilitado" disabled onPress={() => undefined} />
              <NomiButton label="Carregando" loading onPress={() => undefined} />
            </View>
          </NomiCard>
        </Section>

        <Section title="Campos de e-mail" subtitle="Normal, foco, erro e desabilitado — clique no segundo campo para ver o foco">
          <View style={styles.fieldGrid}>
            <NomiCard style={styles.fieldCard}>
              <NomiText variant="caption" tone="muted">Normal</NomiText>
              <NomiTextField label="E-mail" defaultValue="willian@universidade.edu" keyboardType="email-address" autoCapitalize="none" />
            </NomiCard>
            <NomiCard style={styles.fieldCard}>
              <NomiText variant="caption" tone="muted">Em foco</NomiText>
              <NomiTextField label="E-mail" defaultValue="willian@universidade.edu" keyboardType="email-address" autoCapitalize="none" />
            </NomiCard>
            <NomiCard style={styles.fieldCard}>
              <NomiText variant="caption" tone="muted">Com erro</NomiText>
              <NomiTextField label="E-mail" defaultValue="willian@" keyboardType="email-address" autoCapitalize="none" error="Informe um e-mail completo." />
            </NomiCard>
            <NomiCard style={styles.fieldCard}>
              <NomiText variant="caption" tone="muted">Desabilitado</NomiText>
              <NomiTextField label="E-mail" value="willian@universidade.edu" keyboardType="email-address" editable={false} />
            </NomiCard>
          </View>
          <NomiCard>
            <View style={styles.stack}>
              <NomiTextField label="Senha" placeholder="Digite sua senha" secureTextEntry error="A senha precisa de pelo menos 8 caracteres." />
            </View>
          </NomiCard>
        </Section>

        <Section title="Cartões" subtitle="Tons suportados">
          <View style={styles.grid}>
            {tones.map((tone) => (
              <NomiCard key={tone} tone={tone} style={styles.exampleCard}>
                <NomiText variant="heading">Cartão {tone}</NomiText>
                <NomiText variant="caption" tone="muted">Conteúdo de exemplo</NomiText>
              </NomiCard>
            ))}
          </View>
        </Section>

        <Section title="Agenda" subtitle="Item com e sem matéria associada">
          <View style={styles.stack}>
            <NomiAgendaItem eyebrow="HOJE · 14:00" title="Revisar cálculo" detail="Capítulo 3 · 45 min" subject="calculo-matematica" />
            <NomiAgendaItem eyebrow="AMANHÃ · 09:30" title="Leitura de história" detail="Revolução industrial" />
          </View>
        </Section>

        <Section title="Ícones de matérias" subtitle="Variações exportadas do Figma">
          <NomiCard>
            <View style={styles.subjectGrid}>
              {subjects.map(([subject, label]) => (
                <View key={subject} style={styles.subjectItem}>
                  <NomiSubjectIcon subject={subject} size={40} />
                  <NomiText variant="caption" numberOfLines={1}>{label}</NomiText>
                </View>
              ))}
            </View>
          </NomiCard>
        </Section>

        <Section title="Feedback" subtitle="Carregando, vazio, sucesso e erro">
          <View style={styles.grid}>
            {feedbackKinds.map((kind) => (
              <NomiFeedback
                key={kind}
                kind={kind}
                title={{ loading: 'Carregando', empty: 'Nada por aqui', success: 'Tudo certo', error: 'Não foi possível' }[kind]}
                message="Esta é uma mensagem de exemplo para revisar ilustração, cor e espaçamento."
              />
            ))}
          </View>
        </Section>

        <Section title="Estados vazios" subtitle="Ilustrações reutilizáveis">
          <View style={styles.grid}>
            {emptyKinds.map((kind) => (
              <NomiEmptyState key={kind} kind={kind} title="Sem itens" message="Quando houver conteúdo, ele aparecerá aqui." />
            ))}
          </View>
        </Section>

        <NomiText variant="caption" tone="muted" style={styles.footer}>
          Rota disponível apenas em desenvolvimento: /dev/components. Esta galeria não altera nem persiste dados.
        </NomiText>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <NomiText variant="title">{title}</NomiText>
        <NomiText variant="caption" tone="muted">{subtitle}</NomiText>
      </View>
      <View style={[styles.sectionContent, { borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

function TypographyFontStatus() {
  const [status, setStatus] = useState('Verificando fontes no navegador…');

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      setStatus('Status automático disponível na prévia Web.');
      return;
    }

    let active = true;
    void Promise.all([
      document.fonts.load('700 32px "Baloo 2"', 'Aprender no seu ritmo'),
      document.fonts.load('400 15px "Nunito Sans"', 'Aprender no seu ritmo'),
    ]).then(([balooFaces, nunitoFaces]) => {
      if (!active) return;
      setStatus(`Baloo 2: ${balooFaces.length ? 'carregada' : 'não encontrada'} · Nunito Sans: ${nunitoFaces.length ? 'carregada' : 'não encontrada'}`);
    }).catch(() => {
      if (active) setStatus('Não foi possível confirmar o carregamento das fontes.');
    });

    return () => { active = false; };
  }, []);

  return <NomiText variant="caption" tone="muted">{status}</NomiText>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 20, paddingBottom: 56, gap: 24 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  heading: { flex: 1, minWidth: 260, gap: 6 },
  themeModes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  themeButton: { minWidth: 74, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  section: { gap: 12 },
  sectionHeading: { gap: 3 },
  sectionContent: { gap: 12, borderBottomWidth: 1, paddingBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { minWidth: 120, flexGrow: 1, borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  brandColors: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  brandColor: { minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorSample: { width: 40, height: 40, borderWidth: 1, borderRadius: 12 },
  colorLabel: { gap: 2 },
  typeRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#B9A9C7' },
  typeName: { width: 96 },
  brandIconPreview: { minHeight: 156, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24 },
  brandIconItem: { minWidth: 140, alignItems: 'center', gap: 6 },
  brandIconTile: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  avatarPreview: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: 16 },
  mascotCard: { alignItems: 'center', minWidth: 130, gap: 8 },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stack: { gap: 14 },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fieldCard: { flexGrow: 1, flexBasis: 220, minWidth: 220, gap: 10 },
  exampleCard: { minWidth: 180, flexGrow: 1, gap: 4 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  subjectItem: { width: 96, minHeight: 72, alignItems: 'center', justifyContent: 'center', gap: 6 },
  footer: { textAlign: 'center' },
});
