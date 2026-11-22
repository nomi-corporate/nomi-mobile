import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRef, useState } from 'react';
import { palettes, spacing } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';
import { NomiLogo } from '@/components/brand/NomiLogo';
import { NomiButton, NomiCard, NomiFeedback, NomiText, NomiTextField } from '@/components';
import { useAcademic } from '@/features/academic/AcademicProvider';
import { createIdempotencyKey, type AcademicSubject } from '@/features/academic/infrastructure/AcademicClient';

type Step = 'permissions' | 'voice' | 'review' | 'edit' | 'ready' | 'today';
type Colors = (typeof palettes)[keyof typeof palettes];

function Button({ label, colors: _colors, onPress, secondary = false, loading = false }: { label: string; colors: Colors; onPress: () => void; secondary?: boolean; loading?: boolean }) {
  return <NomiButton label={label} variant={secondary ? 'secondary' : 'primary'} onPress={onPress} loading={loading} />;
}

function Header({ title, colors, onBack }: { title: string; colors: Colors; onBack?: () => void }) {
  return <View style={styles.header}>
    {onBack ? <Pressable accessibilityLabel="Voltar" accessibilityRole="button" onPress={onBack} style={styles.back}>
      <NomiText style={[styles.backIcon, { color: colors.accent }]}>‹</NomiText>
    </Pressable> : <View style={styles.backPlaceholder} />}
    <NomiText accessibilityRole="header" variant="title" style={[styles.headerTitle, { color: colors.text }]}>{title}</NomiText>
  </View>;
}

function ItemCard({ eyebrow, title, detail, colors }: { eyebrow: string; title: string; detail: string; colors: Colors }) {
  return <NomiCard style={[styles.itemCard, { borderColor: colors.border }]}>
    <NomiText variant="caption" tone="accent" style={styles.eyebrow}>{eyebrow}</NomiText>
    <NomiText variant="heading" style={styles.itemTitle}>{title}</NomiText>
    <NomiText variant="caption" tone="muted" style={styles.itemDetail}>{detail}</NomiText>
  </NomiCard>;
}

function OnboardingActions({ children }: { children: React.ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function AcademicOnboardingScreen() {
  const { colorScheme } = useNomiTheme();
  const colors = palettes[colorScheme];
  const academic = useAcademic();
  const [step, setStep] = useState<Step>('permissions');
  const [subject, setSubject] = useState('Cálculo I');
  const [teacher, setTeacher] = useState('Ana Costa');
  const [term, setTerm] = useState('2026.2');
  const [schedule, setSchedule] = useState('Segunda · 10:00–11:40');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [savedSubjects, setSavedSubjects] = useState<AcademicSubject[]>([]);
  const createIntents = useRef(new Map<string, string>());

  const back = () => {
    if (step === 'voice') setStep('permissions');
    else if (step === 'review') setStep('voice');
    else if (step === 'edit') setStep('review');
    else if (step === 'ready') setStep('review');
  };

  const saveSubjects = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      const names = ['Cálculo I', 'Engenharia de Software'];
      const current = [...savedSubjects];
      for (const name of names) {
        if (current.some((item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) continue;
        const existing = await academic.listSubjects({ query: name, limit: 20 });
        const match = existing.items.find((item) => item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase());
        let subject = match;
        if (!subject) {
          const signature = JSON.stringify({ name });
          const key = createIntents.current.get(signature) ?? createIdempotencyKey();
          createIntents.current.set(signature, key);
          subject = await academic.createSubject({ name }, key);
          createIntents.current.delete(signature);
        }
        current.push(subject);
        setSavedSubjects([...current]);
      }
      setStep('ready');
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Não foi possível salvar suas matérias.');
    } finally { setSaving(false); }
  };

  if (step === 'today') {
    return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <NomiText variant="caption" tone="accent" style={styles.eyebrow}>HOJE</NomiText>
      <NomiText accessibilityRole="header" variant="display" style={styles.todayTitle}>Sua rotina, com mais clareza.</NomiText>
      <NomiText variant="supporting" tone="muted" style={styles.description}>O seu semestre está pronto para receber compromissos, anotações e lembretes.</NomiText>
      <NomiFeedback kind="empty" title="Nenhum compromisso hoje" message="Quando houver uma aula ou tarefa, ela aparecerá aqui." />
    </ScrollView>;
  }

  return <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    {step !== 'permissions' && <Header title={step === 'voice' ? 'Cadastrar matérias' : step === 'review' ? 'Revisar matérias' : step === 'edit' ? 'Editar matéria' : 'Matérias cadastradas'} colors={colors} onBack={back} />}

    {step === 'permissions' && <>
      <View style={styles.brandRow}><NomiLogo width={122} /></View>
      <NomiText accessibilityRole="header" variant="title" style={styles.onboardingTitle}>Seu semestre, seu ritmo</NomiText>
      <NomiText variant="supporting" tone="muted" style={styles.description}>Conte suas matérias ou cadastre uma por vez. Você revisa os dados antes de salvar.</NomiText>
      <View style={[styles.flexibleSpace, { borderColor: colors.border }]}>
        <ItemCard eyebrow="POR VOZ" title="Conte do seu jeito" detail="Fale as matérias, professores e horários." colors={colors} />
        <ItemCard eyebrow="MANUAL" title="Uma matéria por vez" detail="Preencha os dados no seu ritmo." colors={colors} />
      </View>
      <OnboardingActions>
        <Button label="Falar com a Nomi" colors={colors} onPress={() => setStep('voice')} />
        <Button label="Cadastrar manualmente" colors={colors} secondary onPress={() => setStep('edit')} />
        <Button label="Agora não · ir para Hoje" colors={colors} secondary onPress={() => setStep('today')} />
      </OnboardingActions>
    </>}

    {step === 'voice' && <>
      <NomiText variant="supporting" tone="muted" style={styles.description}>Fale as matérias e os professores do seu semestre.</NomiText>
      <NomiCard style={styles.voiceCard}>
        <NomiText variant="caption" tone="accent" style={styles.eyebrow}>●  ESCUTANDO · 00:08</NomiText>
        <NomiText variant="heading" style={styles.quote}>“Tenho Cálculo com a Ana e Engenharia de Software com o Bruno.”</NomiText>
        <NomiText variant="caption" tone="muted" style={styles.itemDetail}>Revise os detalhes antes de salvar.</NomiText>
      </NomiCard>
      <OnboardingActions>
        <Button label="Terminar e revisar" colors={colors} onPress={() => setStep('review')} />
        <Button label="Cadastrar por texto" colors={colors} secondary onPress={() => setStep('review')} />
      </OnboardingActions>
    </>}

    {step === 'review' && <>
      <NomiText variant="supporting" tone="muted" style={styles.description}>Revise os nomes antes de salvar.</NomiText>
      <View style={styles.list}>
        <ItemCard eyebrow="MATÉRIA 01" title="Cálculo I" detail="Profª Ana · Horário ainda não informado" colors={colors} />
        <ItemCard eyebrow="MATÉRIA 02" title="Engenharia de Software" detail="Prof. Bruno · Horário ainda não informado" colors={colors} />
      </View>
      {saveError ? <NomiFeedback kind="error" title="Não foi possível salvar" message={saveError} /> : null}
      <OnboardingActions>
        <Button label="Salvar minhas matérias" colors={colors} onPress={() => void saveSubjects()} loading={saving} />
        <Button label="Corrigir informações" colors={colors} secondary onPress={() => setStep('edit')} />
      </OnboardingActions>
    </>}

    {step === 'edit' && <>
      <NomiText variant="supporting" tone="muted" style={styles.description}>Confira a matéria, a professora e o horário.</NomiText>
      <View style={styles.form}>
        <Field label="MATÉRIA" value={subject} onChangeText={setSubject} />
        <Field label="PROFESSORA" value={teacher} onChangeText={setTeacher} />
        <Field label="SEMESTRE" value={term} onChangeText={setTerm} />
        <Field label="HORÁRIO" value={schedule} onChangeText={setSchedule} />
      </View>
      <OnboardingActions><Button label="Salvar e continuar" colors={colors} onPress={() => setStep('ready')} /></OnboardingActions>
    </>}

    {step === 'ready' && <>
      <NomiFeedback kind="success" title="Seu semestre está organizado" message="Cálculo I e Engenharia de Software foram cadastradas. Você pode editar os dados depois e vincular os professores quando estiverem disponíveis." />
      <NomiText variant="caption" tone="muted" style={styles.pendingNote}>As matérias já estão persistidas no serviço Academic. Professores e horários entram na próxima etapa.</NomiText>
      <OnboardingActions><Button label="Ir para hoje" colors={colors} onPress={() => setStep('today')} /></OnboardingActions>
    </>}
  </ScrollView>;
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <NomiTextField label={label} value={value} onChangeText={onChangeText} />;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, gap: 12 },
  brandRow: { height: 40, justifyContent: 'center', marginBottom: 2 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backPlaceholder: { width: 44, height: 44 },
  backIcon: { fontSize: 38, lineHeight: 38, marginTop: -4 },
  headerTitle: { fontFamily: 'Baloo 2', fontSize: 22, fontWeight: '700' },
  description: { fontFamily: 'Nunito Sans', fontSize: 14, lineHeight: 18 },
  onboardingTitle: { fontFamily: 'Baloo 2', fontSize: 22, lineHeight: 29, fontWeight: '700', marginTop: 2 },
  flexibleSpace: { flex: 1, justifyContent: 'center', gap: 16, minHeight: 250, marginVertical: 8 },
  list: { gap: 16, marginTop: 12 },
  itemCard: { minHeight: 96, borderWidth: 1, borderRadius: 20, padding: 18, gap: 4 },
  eyebrow: { fontFamily: 'Nunito Sans', fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.3 },
  itemTitle: { fontFamily: 'Baloo 2', fontSize: 20, lineHeight: 25, fontWeight: '700' },
  itemDetail: { fontFamily: 'Nunito Sans', fontSize: 13, lineHeight: 17 },
  voiceCard: { minHeight: 176, borderRadius: 24, gap: 14, marginTop: 12 },
  quote: { fontFamily: 'Baloo 2', fontSize: 24, lineHeight: 30, fontWeight: '700' },
  pendingNote: { fontFamily: 'Nunito Sans', fontSize: 12, lineHeight: 16, marginTop: 2 },
  saveError: { fontFamily: 'Nunito Sans', fontSize: 13, lineHeight: 18, marginTop: 2 },
  form: { gap: 12, marginTop: 12 },
  actions: { gap: 10, marginTop: 'auto', paddingTop: 20 },
  todayTitle: { fontFamily: 'Baloo 2', fontSize: 28, lineHeight: 34, fontWeight: '700' },
});
