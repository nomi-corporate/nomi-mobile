import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from './AuthProvider';
import { AuthFailure } from './domain/auth';
import { getPasswordRequirements, getPasswordStrength, isValidEmail, isValidRegistrationPassword } from './domain/registrationValidation';
import { NomiMascotAnimated } from '../../components/brand/NomiMascotAnimated';
import { NomiLogo } from '../../components/brand/NomiLogo';
import { NomiButton, NomiCard, NomiText, NomiTextField } from '@/components';
import { palettes } from '@/theme/tokens';
import { useNomiTheme } from '@/theme/NomiThemeProvider';

type Screen = 'welcome' | 'register' | 'signIn' | 'recover' | 'codeRequested' | 'confirmEmail' | 'newPassword' | 'passwordUpdated' | 'reviewCode';
type Colors = (typeof palettes)[keyof typeof palettes] & { panel: string };

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: Colors;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoComplete?: 'email' | 'password' | 'new-password' | 'name' | 'one-time-code';
  error?: string;
  onBlur?: () => void;
};

function AuthField({ label, value, onChangeText, colors, secureTextEntry, keyboardType, autoComplete, error, onBlur }: FieldProps) {
  return <NomiTextField
      label={label}
      autoCapitalize="none"
      autoComplete={autoComplete}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      error={error}
      selectionColor={colors.accent}
      inputStyle={styles.fieldInput}
    />
}

function ActionButton({ label, colors, onPress, variant = 'primary', disabled, busy }: {
  label: string;
  colors: Colors;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'link';
  disabled?: boolean;
  busy?: boolean;
}) {
  return <NomiButton label={label} variant={variant === 'link' ? 'tertiary' : variant} onPress={onPress} disabled={disabled} loading={busy} />;
}

function Brand({ width = 122 }: { width?: number }) {
  return <View style={styles.brandRow}>
    <NomiLogo width={width} />
  </View>;
}

export function AuthScreen() {
  const router = useRouter();
  const { state, configurationError, signIn, signInWithEmail, signOut, retry, rememberSignIn, clearSignInReminder, registerAccount, confirmEmail, resendConfirmation, requestPasswordRecovery, resetPassword } = useAuth();
  const [screen, setScreen] = useState<Screen>('welcome');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [code, setCode] = useState('');
  const [flowMessage, setFlowMessage] = useState<string>();
  const [showSessionMessage, setShowSessionMessage] = useState(false);
  const [flowBusy, setFlowBusy] = useState(false);
  const { colorScheme } = useNomiTheme();
  const palette = palettes[colorScheme];
  const colors: Colors = { ...palette, panel: palette.tint };
  const busy = ['restoring', 'signingIn', 'signingOut'].includes(state.status);
  const emailError = emailTouched && email.trim() && !isValidEmail(email) ? 'Informe um e-mail válido.' : undefined;
  const passwordRequirements = getPasswordRequirements(password);
  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    if (!(state.status === 'signedOut' && state.message) && state.status !== 'unavailable') return;
    setScreen('signIn');
    setShowSessionMessage(true);
    setFlowMessage(undefined);
  }, [state.status, state.message]);

  function back() {
    setFlowMessage(undefined);
    setShowSessionMessage(false);
    if (screen === 'welcome') { router.back(); return; }
    if (screen === 'register' || screen === 'signIn') {
      if (screen === 'signIn') void clearSignInReminder();
      setScreen('welcome'); return;
    }
    if (screen === 'recover') { openSignIn(); return; }
    if (screen === 'codeRequested') { setScreen('recover'); return; }
    if (screen === 'confirmEmail') { setScreen('register'); return; }
    if (screen === 'newPassword') { setScreen('codeRequested'); return; }
    if (screen === 'passwordUpdated') { openSignIn(); return; }
    setScreen('newPassword');
  }

  function openSignIn() {
    void rememberSignIn();
    setShowSessionMessage(false);
    setFlowMessage(undefined);
    setScreen('signIn');
  }

  function flowError() {
    setFlowMessage('Não foi possível concluir esta etapa. Confira os dados e tente novamente.');
  }

  function updateEmail(value: string) {
    setEmail(value);
    setFlowMessage(undefined);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setFlowMessage(undefined);
  }

  function updatePasswordConfirmation(value: string) {
    setPasswordConfirmation(value);
    setFlowMessage(undefined);
  }

  async function submitSignIn() {
    setEmailTouched(true);
    setShowSessionMessage(false);
    if (!isValidEmail(email)) { setFlowMessage('Informe um e-mail válido.'); return; }
    if (!password || busy) return;
    setFlowMessage(undefined);
    setShowSessionMessage(true);
    await signInWithEmail(email.trim(), password, false);
  }

  async function submitRegister() {
    setShowSessionMessage(false);
    setEmailTouched(true);
    if (!name.trim()) {
      setFlowMessage('Informe seu nome para continuar.');
      return;
    }
    if (!isValidEmail(email)) {
      setFlowMessage('Confira o formato do seu e-mail.');
      return;
    }
    if (!isValidRegistrationPassword(password)) {
      setFlowMessage('Use de 12 a 128 caracteres, com maiúscula, minúscula, número e símbolo.');
      return;
    }
    if (password !== passwordConfirmation) {
      setFlowMessage('As senhas não conferem. Revise a confirmação.');
      return;
    }
    setFlowMessage(undefined);
    setFlowBusy(true);
    try {
      await registerAccount(name.trim(), email.trim(), password);
      setScreen('confirmEmail');
    } catch (error) {
      if (configurationError) setFlowMessage(configurationError);
      else if (error instanceof AuthFailure && error.status === 409) setFlowMessage('Não foi possível iniciar o cadastro. Se já começou a se cadastrar, tente confirmar seu e-mail; se já tem conta, entre ou recupere a senha.');
      else if (error instanceof AuthFailure && error.status === 429) setFlowMessage('Muitas tentativas. Aguarde um pouco e tente novamente.');
      else if (error instanceof AuthFailure && error.status && error.status >= 500) setFlowMessage('O serviço de cadastro está indisponível. Tente novamente em instantes.');
      else if (error instanceof AuthFailure && error.kind === 'network') setFlowMessage('Não foi possível conectar ao serviço. Confira sua internet e tente novamente.');
      else flowError();
    }
    finally { setFlowBusy(false); }
  }

  async function submitRecoveryEmail() {
    setEmailTouched(true);
    if (!isValidEmail(email)) { setFlowMessage('Informe um e-mail válido para continuar.'); return; }
    setFlowMessage(undefined);
    setFlowBusy(true);
    try {
      await requestPasswordRecovery(email.trim());
      setScreen('codeRequested');
    } catch { flowError(); }
    finally { setFlowBusy(false); }
  }

  async function submitConfirmation() {
    if (!isValidEmail(email)) { setEmailTouched(true); setFlowMessage('Informe um e-mail válido para localizar seu cadastro.'); return; }
    if (!/^\d{6}$/.test(code.trim())) { setFlowMessage('Informe o código de 6 dígitos enviado ao seu e-mail.'); return; }
    setFlowMessage(undefined);
    setFlowBusy(true);
    try { await confirmEmail(email.trim(), code.trim()); openSignIn(); setFlowMessage('E-mail confirmado. Entre para continuar.'); }
    catch { flowError(); }
    finally { setFlowBusy(false); }
  }

  async function submitResend() {
    if (!isValidEmail(email)) { setEmailTouched(true); setFlowMessage('Informe um e-mail válido para reenviar o código.'); return; }
    setFlowMessage(undefined);
    setFlowBusy(true);
    try { await resendConfirmation(email.trim()); setFlowMessage('Se houver uma conta para esse e-mail, um novo código será enviado.'); }
    catch { flowError(); }
    finally { setFlowBusy(false); }
  }

  async function submitNewPassword() {
    if (!/^\d{6}$/.test(code.trim())) { setFlowMessage('Informe o código de 6 dígitos enviado ao seu e-mail.'); return; }
    if (!isValidRegistrationPassword(password)) { setFlowMessage('Use de 12 a 128 caracteres, com maiúscula, minúscula, número e símbolo.'); return; }
    if (password !== passwordConfirmation) { setFlowMessage('As senhas não conferem.'); return; }
    setFlowMessage(undefined);
    setFlowBusy(true);
    try { await resetPassword(email.trim(), code.trim(), password); setScreen('passwordUpdated'); }
    catch { setScreen('reviewCode'); setFlowMessage('Código incorreto ou expirado. Revise os dígitos ou solicite um novo código.'); }
    finally { setFlowBusy(false); }
  }

  function renderHeader(title: string, description?: string) {
    return <>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Voltar" accessibilityRole="button" hitSlop={8} onPress={back} style={styles.backButton}>
        <NomiText style={[styles.backIcon, { color: colors.accent }]}>‹</NomiText>
        </Pressable>
        <NomiText accessibilityRole="header" variant="title" style={[styles.headerTitle, { color: colors.text }]}>{title}</NomiText>
      </View>
      {description && <NomiText variant="supporting" style={[styles.description, { color: colors.muted }]}>{description}</NomiText>}
    </>;
  }

  function renderActions(actions: React.ReactNode) {
    return <View style={styles.actions}>{actions}</View>;
  }

  function renderWelcome() {
    return <>
      <Brand width={110} />
      <NomiText style={[styles.welcomeDescription, { color: colors.muted }]}>Matérias, compromissos e anotações no mesmo lugar.</NomiText>
      <NomiCard tone="tint" style={styles.welcomePanel}>
        <NomiMascotAnimated pose="greeting" size={205} accessibilityLabel="Mascote Nomi saudando" style={styles.mascot} />
        <NomiText variant="heading" tone="accent" style={styles.welcomePanelTitle}>Matérias, agenda e anotações.</NomiText>
      </NomiCard>
      {renderActions(<>
        <ActionButton label="Começar meu Nomi" colors={colors} onPress={() => setScreen('register')} />
        <ActionButton label="Já tenho conta" colors={colors} variant="secondary" onPress={openSignIn} />
      </>)}
    </>;
  }

  function renderRegister() {
    return <>
      <Brand />
      {renderHeader('Criar conta')}
      <NomiText style={[styles.greeting, { color: colors.muted }]}>Seu semestre começa aqui.</NomiText>
      <View style={styles.form}>
        <AuthField label="SEU NOME" value={name} onChangeText={setName} autoComplete="name" colors={colors} />
        <AuthField label="E-MAIL" value={email} onChangeText={updateEmail} onBlur={() => setEmailTouched(true)} error={emailError} keyboardType="email-address" autoComplete="email" colors={colors} />
        <AuthField label="SENHA" value={password} onChangeText={updatePassword} secureTextEntry autoComplete="new-password" colors={colors} />
        {password.length > 0 && <View style={styles.passwordGuidance}>
          <NomiText variant="caption" tone="muted">Para proteger sua conta, a senha deve ter:</NomiText>
          <PasswordCheck label="12 a 128 caracteres" complete={passwordRequirements.length} />
          <PasswordCheck label="Uma letra maiúscula e uma minúscula" complete={passwordRequirements.uppercase && passwordRequirements.lowercase} />
          <PasswordCheck label="Um número e um símbolo" complete={passwordRequirements.number && passwordRequirements.symbol} />
          <NomiText variant="caption" tone={passwordStrength === 'strong' ? 'success' : 'muted'}>
            {passwordStrength === 'strong' ? 'Senha forte' : passwordStrength === 'fair' ? 'Quase lá · complete os critérios acima' : 'Combine letras, número e símbolo.'}
          </NomiText>
        </View>}
        <AuthField label="CONFIRMAR SENHA" value={passwordConfirmation} onChangeText={updatePasswordConfirmation} secureTextEntry autoComplete="new-password" colors={colors} error={passwordConfirmation && password !== passwordConfirmation ? 'As senhas não conferem.' : undefined} />
      </View>
      <NomiText style={[styles.legal, { color: colors.muted }]}>Ao criar sua conta, você aceita os Termos e a Política de Privacidade.</NomiText>
      {(configurationError || flowMessage || (showSessionMessage && state.message)) && <NomiText accessibilityLiveRegion="polite" style={[styles.message, { color: colors.muted }]}>{configurationError ?? flowMessage ?? state.message}</NomiText>}
      {renderActions(<>
        <ActionButton label="Criar minha conta" colors={colors} onPress={() => { void submitRegister(); }} disabled={flowBusy || busy} busy={flowBusy} />
        {Platform.OS === 'android' && <ActionButton label="Continuar com Google" colors={colors} variant="secondary" onPress={() => { setFlowMessage(undefined); setShowSessionMessage(true); void signIn(); }} disabled={flowBusy || busy || !!configurationError} busy={busy} />}
        <ActionButton label="Preciso confirmar meu cadastro" colors={colors} variant="link" onPress={() => { setFlowMessage(undefined); setShowSessionMessage(false); setScreen('confirmEmail'); }} />
        <ActionButton label="Entrar na minha conta" colors={colors} variant="secondary" onPress={openSignIn} />
      </>)}
    </>;
  }

  function renderSignIn() {
    return <>
      <Brand />
      {renderHeader('Entrar')}
      <NomiText style={[styles.greeting, { color: colors.muted }]}>Bom ter você de volta.</NomiText>
      <View style={styles.form}>
        <AuthField label="E-MAIL" value={email} onChangeText={updateEmail} onBlur={() => setEmailTouched(true)} error={emailError} keyboardType="email-address" autoComplete="email" colors={colors} />
        <AuthField label="SENHA" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" colors={colors} />
      </View>
      {(configurationError || flowMessage || (showSessionMessage && state.message)) && <NomiText accessibilityLiveRegion="polite" style={[styles.message, { color: colors.muted }]}>{configurationError ?? flowMessage ?? state.message}</NomiText>}
      {renderActions(<>
        <ActionButton label="Entrar" colors={colors} onPress={() => { void submitSignIn(); }} disabled={!email.trim() || !password || busy} busy={busy} />
        {Platform.OS === 'android' && <ActionButton label="Continuar com Google" colors={colors} variant="secondary" onPress={() => { setFlowMessage(undefined); setShowSessionMessage(true); void signIn(); }} disabled={busy || !!configurationError} busy={busy} />}
        <ActionButton label="Esqueci minha senha" colors={colors} variant="secondary" onPress={() => { setFlowMessage(undefined); setScreen('recover'); }} />
      </>)}
    </>;
  }

  function renderRecover() {
    return <>
      <Brand />
      {renderHeader('Recuperar senha', 'Informe seu e-mail para receber um código de recuperação.')}
      <View style={styles.form}><AuthField label="E-MAIL" value={email} onChangeText={updateEmail} onBlur={() => setEmailTouched(true)} error={emailError} keyboardType="email-address" autoComplete="email" colors={colors} /></View>
      {flowMessage && <NomiText accessibilityLiveRegion="polite" style={[styles.message, { color: colors.muted }]}>{flowMessage}</NomiText>}
      {renderActions(<>
        <ActionButton label="Enviar código" colors={colors} onPress={() => { void submitRecoveryEmail(); }} disabled={flowBusy} busy={flowBusy} />
        <ActionButton label="Voltar para entrar" colors={colors} variant="secondary" onPress={openSignIn} />
      </>)}
    </>;
  }

  function renderCodeRequested() {
    return <>
      <Brand />
      {renderHeader('Confira seu e-mail', 'Se houver uma conta para esse e-mail, você receberá um código.')}
      <NomiCard tone="tint" style={styles.infoPanel}><NomiText variant="heading" tone="accent" style={styles.infoTitle}>Continue com o código.</NomiText></NomiCard>
      {renderActions(<ActionButton label="Informar código e nova senha" colors={colors} onPress={() => setScreen('newPassword')} />)}
    </>;
  }

  function renderConfirmEmail() {
    return <>
      <Brand />
      {renderHeader('Confirme seu e-mail', 'Digite o código enviado ao seu e-mail. Depois da confirmação, você poderá entrar.')}
      <View style={styles.form}>
        {!isValidEmail(email) && <AuthField label="E-MAIL" value={email} onChangeText={updateEmail} onBlur={() => setEmailTouched(true)} error={emailError} keyboardType="email-address" autoComplete="email" colors={colors} />}
        {isValidEmail(email) && <NomiText variant="supporting" tone="muted">O código foi enviado para {email.trim()}.</NomiText>}
        <AuthField label="CÓDIGO DO E-MAIL" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} />
      </View>
      {flowMessage && <NomiText accessibilityLiveRegion="polite" style={[styles.message, { color: colors.muted }]}>{flowMessage}</NomiText>}
      {renderActions(<>
        <ActionButton label="Confirmar e-mail" colors={colors} onPress={() => { void submitConfirmation(); }} disabled={flowBusy} busy={flowBusy} />
        <ActionButton label="Reenviar código" colors={colors} variant="secondary" onPress={() => { void submitResend(); }} disabled={flowBusy} busy={flowBusy} />
        <ActionButton label="Voltar à entrada" colors={colors} variant="link" onPress={openSignIn} />
      </>)}
    </>;
  }

  function renderNewPassword() {
    return <>
      <Brand />
      {renderHeader('Crie uma nova senha', 'Use o código do e-mail e escolha sua nova senha.')}
      <View style={styles.form}>
        <AuthField label="CÓDIGO DE RECUPERAÇÃO" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} />
        <AuthField label="NOVA SENHA" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" colors={colors} />
        <AuthField label="CONFIRMAR SENHA" value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry autoComplete="password" colors={colors} />
      </View>
      {flowMessage && <NomiText accessibilityLiveRegion="polite" style={[styles.message, { color: colors.muted }]}>{flowMessage}</NomiText>}
      {renderActions(<>
        <ActionButton label="Salvar nova senha" colors={colors} onPress={() => { void submitNewPassword(); }} disabled={flowBusy} busy={flowBusy} />
        <ActionButton label="Solicitar outro código" colors={colors} variant="secondary" onPress={() => setScreen('recover')} />
      </>)}
    </>;
  }

  function renderPasswordUpdated() {
    return <>
      <Brand />
      {renderHeader('Senha atualizada', 'Sua senha foi alterada. Entre novamente para continuar.')}
      {renderActions(<ActionButton label="Voltar à entrada" colors={colors} onPress={openSignIn} />)}
    </>;
  }

  function renderReviewCode() {
    return <>
      <Brand />
      {renderHeader('Revise o código', 'Código incorreto ou expirado. Revise os dígitos ou solicite um novo código.')}
      <View style={styles.form}><AuthField label="CÓDIGO" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" colors={colors} /></View>
      {renderActions(<>
        <ActionButton label="Tentar novamente" colors={colors} onPress={() => setScreen('newPassword')} />
        <ActionButton label="Solicitar outro código" colors={colors} variant="secondary" onPress={() => setScreen('recover')} />
      </>)}
    </>;
  }

  const content = screen === 'welcome' ? renderWelcome()
    : screen === 'register' ? renderRegister()
      : screen === 'signIn' ? renderSignIn()
        : screen === 'recover' ? renderRecover()
          : screen === 'codeRequested' ? renderCodeRequested()
            : screen === 'confirmEmail' ? renderConfirmEmail()
              : screen === 'newPassword' ? renderNewPassword()
                : screen === 'passwordUpdated' ? renderPasswordUpdated()
                  : renderReviewCode();

  return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {content}
        {state.status === 'unavailable' && state.recovery === 'restore' && <ActionButton label="Tentar novamente" colors={colors} variant="secondary" onPress={() => { void retry(); }} busy={busy} />}
        {state.status === 'unavailable' && state.recovery === 'signOut' && <ActionButton label="Sair desta sessão" colors={colors} variant="link" onPress={() => { void signOut(); }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, gap: 20 },
  brandRow: { height: 40, justifyContent: 'center', marginTop: 12 },
  header: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 38, fontWeight: '300', lineHeight: 38, marginTop: -4 },
  headerTitle: { fontFamily: 'Baloo 2', fontSize: 22, fontWeight: '700' },
  welcomeDescription: { fontFamily: 'Nunito Sans', fontSize: 14, lineHeight: 18, marginTop: 8 },
  welcomePanel: { width: 305, height: 246, alignSelf: 'center', borderRadius: 28, alignItems: 'center', justifyContent: 'center', padding: 8, marginTop: 4, overflow: 'hidden' },
  mascot: { width: 205, height: 191 },
  welcomePanelTitle: { textAlign: 'center' },
  greeting: { fontFamily: 'Baloo 2', fontSize: 24, fontWeight: '700', lineHeight: 30, marginTop: 4 },
  description: { fontFamily: 'Nunito Sans', fontSize: 14, lineHeight: 20, marginTop: 6 },
  form: { gap: 16, marginTop: 10 },
  passwordGuidance: { gap: 4, marginTop: -8, paddingHorizontal: 2 },
  fieldInput: { flex: 1, padding: 0, fontFamily: 'Nunito Sans', fontSize: 15, lineHeight: 19 },
  legal: { fontFamily: 'Nunito Sans', fontSize: 12, lineHeight: 16, marginTop: 2 },
  message: { fontFamily: 'Nunito Sans', fontSize: 14, lineHeight: 19, marginTop: -4 },
  infoPanel: { minHeight: 154, borderRadius: 28, justifyContent: 'center', marginTop: 10 },
  infoTitle: {},
  actions: { gap: 10, marginTop: 'auto', paddingTop: 20 },
});

function PasswordCheck({ label, complete }: { label: string; complete: boolean }) {
  return <NomiText variant="caption" tone={complete ? 'success' : 'muted'} accessibilityLabel={`${label}: ${complete ? 'atendido' : 'pendente'}`}>
    {complete ? '✓' : '○'} {label}
  </NomiText>;
}
