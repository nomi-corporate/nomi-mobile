@AGENTS.md

# Plano de implementação · 09 · Perfil e preferências

> As regras do time estão em `AGENTS.md` (importado acima) e valem para tudo aqui.
> Este arquivo guarda o plano de implementação das telas da seção **09 · Perfil e preferências** do Figma e os prompts para executá-lo no Claude Code, um por etapa.

## Referências

- **Imagens das telas (ler antes de implementar):** `docs/referencias/figma/09-perfil-preferencias/`. São 14 PNGs em 2x, um por tela e por tema:

  | Tela | Claro | Escuro | Nó no Figma |
  |---|---|---|---|
  | 09.01 Perfil | `09.01-perfil-light.png` | `09.01-perfil-dark.png` | 18:1605 / 18:1648 |
  | 09.02 Editar perfil | `09.02-editar-perfil-light.png` | `09.02-editar-perfil-dark.png` | 20:2845 / 20:3204 |
  | 09.03 Configurações | `09.03-configuracoes-light.png` | `09.03-configuracoes-dark.png` | 18:1691 / 18:1735 |
  | 09.04 Aparência | `09.04-aparencia-light.png` | `09.04-aparencia-dark.png` | 18:1779 / 18:1811 |
  | 09.05 Privacidade | `09.05-privacidade-light.png` | `09.05-privacidade-dark.png` | 18:1843 / 18:1872 |
  | 09.06 Dispositivos | `09.06-dispositivos-light.png` | `09.06-dispositivos-dark.png` | 18:1901 / 18:1929 |
  | 09.07 Lembretes | `09.07-lembretes-light.png` | `09.07-lembretes-dark.png` | 195:8164 / 195:8218 |

- **Figma:** arquivo `VdmGhvLilFgMFDro8qt3GM`, seção `22:3460` ("09 · Perfil e preferências"), dentro da página `7:6`. Se o Figwright ou o MCP do Figma estiver disponível, use os nós acima para conferir medidas exatas. As imagens são a referência visual; os valores numéricos abaixo foram extraídos do Figma.
- **Contrato:** [TEC-003](https://github.com/nomi-corporate/nomi-academic/blob/master/docs/TEC-003-contratos-api-eventos-v1.md), seções 14.2 (perfil, `GET/PATCH /me`) e de Notifications (`GET/PUT /api/v1/notification-preferences`).

## Decisões em aberto (confirmar com o time antes da etapa correspondente)

1. **Navegação.** O app usa abas nativas Início / Matérias / Perfil. O Figma usa uma barra flutuante Hoje / Agenda / Grupos / Menu, e o Perfil é aberto a partir do **Menu**. A etapa 3 segue o Figma.
2. **Dispositivos (09.06).** O Figma mostra iPhone e Apple Watch, mas o alvo atual é **Wear OS** (Apple Watch é futuro). Os textos devem ser adaptados para Android/Wear OS ou a tela fica como informativa.
3. **Inconsistências no Figma:**
   - Aparência tem 3 opções (Claro, Escuro, Sistema), mas só 2 botões ("Usar tema escuro" e "Usar tema claro") e nenhum estado de selecionado. Proposta: o cartão é o seletor (estado `selected`) e um único botão "Salvar aparência".
   - Em Editar perfil (09.02) e Lembretes (09.07), a aba ativa da barra é "Hoje"; o correto é "Menu".
   - "Exportar ou excluir seus dados" (09.05) não tem contrato. Depende da TEC-008; nesta entrega é só informativo.
   - Curso e semestre ("Engenharia de Software · Semestre 2026.2") não aparecem no `GET /me` do TEC-003. Confirmar a origem antes de exibir.

## Tokens extraídos do Figma

Variáveis do Figma: `color/bg`, `color/surface`, `color/text`, `color/muted`, `color/accent`, `color/tint`, `color/outline`, `color/onAccent`.

| Token | Claro | Escuro |
|---|---|---|
| bg | `#FFFFFF` | `#17101F` |
| surface | `#FFFFFF` | `#261A34` |
| text | `#281B37` | `#FFF8FF` |
| muted | `#5C506A` | `#DCC9E7` |
| accent | `#7749B8` | `#C5A0F0` |
| tint | `#F0E2FF` | `#342047` |
| outline | `#E7DFF0` | `#493357` |
| onAccent | `#FFFFFF` | `#281B37` |
| sombra do botão primário (sólida, y=5, sem blur) | `#543086` | `#5F398C` |

- **Raios:** frame 32 · cartão de perfil 24 · `NavRow` 22 · barra inferior 20 · `Field` 18 · botão de notificações 18 · `Button` 16 · item da barra 12.
- **Espaçamento:** padding de tela 24 · gap vertical entre blocos 14 · padding do `Field` 14×16 (gap 6) · padding do `NavRow` 12 (gap 12) · padding do cartão de perfil 16 (gap 16).
- **Bordas:** 2px `outline` em `Field`, `NavRow` e `OptionCard`.
- **Tipografia:** line-height de 130% em todas:
  - Baloo 2 Bold: título do header 22, nome no perfil 23, título do `OptionCard`.
  - Nunito Sans:
    - Regular: valor do `Field` 15, legenda 12, "Sair da conta" 13, subtítulo do `NavRow` 11, rótulo da aba 10.
    - Bold: botão 14, título do `NavRow` 14, "Semestre" 11, `SectionLabel` 10 (maiúsculas), aba ativa 10.
- **Sombra da barra inferior:** `#00000014`, y=4, blur 12.
- **Tamanhos:** botão 52 de altura · `Field` 72 · `NavRow` 64 · `OptionCard` 96 · avatar 64 · alvos de toque 44 · ícones 22 (header) e 20 (barra).

O `src/theme/tokens.ts` atual **não** bate com esses valores (ex.: accent `#7044BC`) e não tem `tint`, `outline` nem `onAccent`.

## Componentes (`src/components/`)

Todos leem o tema por `useNomiTheme()`, têm `accessibilityRole`/`accessibilityLabel`, alvo de toque ≥ 44 e respeitam o tamanho de fonte do sistema.

| Componente | Origem no Figma | Props principais |
|---|---|---|
| `ScreenHeader` | "Cabeçalho" | `title`, `onBack?`, `showNotifications?` |
| `Field` | `Nomi / field` (14:40 claro, 14:55 escuro) | `label`, `value`, `readOnly?`, `onChangeText?`, `error?` |
| `Button` | `Nomi / Button` (14:62): Primary, Secondary, Disabled, Loading | `label`, `variant: 'primary' \| 'secondary'`, `loading?`, `disabled?`, `onPress` |
| `NavRow` | cartões "Aparência ›" e "Cancelar ›" | `title`, `subtitle`, `onPress` |
| `OptionCard` | componente 14:43 (legenda + título + descrição) | `eyebrow`, `title`, `description`, `selected?`, `onPress?` |
| `ProfileSummary` | "Perfil do aluno" | `name`, `course?`, `term?`, `avatarUrl?` |
| `SectionLabel` | "DADOS DA CONTA" | `children` |
| `MainNavBar` | "Navegação principal" | usado como `tabBar` do Expo Router |
| `Icon` | back, bell, home, calendar, group, menu, avatar | `name`, `size`, `color` |

## Rotas

```
src/app/(tabs)/_layout.tsx           Tabs com MainNavBar: Hoje / Agenda / Grupos / Menu
src/app/(tabs)/index.tsx             Hoje (placeholder)
src/app/(tabs)/agenda.tsx            Agenda (placeholder)
src/app/(tabs)/groups.tsx            Grupos (placeholder)
src/app/(tabs)/menu/_layout.tsx      Stack
src/app/(tabs)/menu/index.tsx        09.01 Perfil
src/app/(tabs)/menu/edit.tsx         09.02 Editar perfil
src/app/(tabs)/menu/settings.tsx     09.03 Configurações
src/app/(tabs)/menu/appearance.tsx   09.04 Aparência
src/app/(tabs)/menu/privacy.tsx      09.05 Privacidade
src/app/(tabs)/menu/devices.tsx      09.06 Dispositivos
src/app/(tabs)/menu/reminders.tsx    09.07 Lembretes
```

## Etapas

Cada etapa é uma issue e um PR no `nomi-mobile`. A ordem é: 1 → 2 → 3 → 4 → 5 → 6.

1. **Base de design.** Tokens, fontes e `ThemeProvider` (`system | light | dark`).
2. **Componentes base.** Os 9 componentes, mais uma rota de catálogo só em desenvolvimento.
3. **Navegação.** `(tabs)` com `MainNavBar` e pilha do Menu.
4. **Telas estáticas.** As 7 telas montadas só com componentes e dados simulados identificados.
5. **Perfil e aparência com API.** `GET/PATCH /me`, ETag e `If-Match`, Editar perfil e Aparência.
6. **Lembretes com API.** `GET/PUT notification-preferences`.

## Verificação (todas as etapas)

```sh
npm ci
npm run typecheck
npx expo install --check
npm run export:android
npm run export:web
```

Revise visualmente com `npm run web`, nos dois temas, comparando com os PNGs de `docs/referencias/figma/09-perfil-preferencias/`.

---

## Prompts para o Claude Code

Cada prompt vale para **um** repositório (`nomi-corporate/nomi-mobile`) e **uma** issue. Rode um por vez, a partir da `master` atualizada.

### Prompt 1 · Base de design

```
Repositório: nomi-corporate/nomi-mobile. Leia CLAUDE.md e AGENTS.md antes de começar.

Issue: procure uma issue aberta com o título "[Perfil] Base de design: tokens, fontes e tema". Se não existir, crie-a com esse título, descrevendo o escopo abaixo e os critérios de aceite, e use o número dela na branch e no PR (Refs #N).

Escopo:
- Reescreva src/theme/tokens.ts com os tokens claro/escuro, raios, espaçamentos e escala tipográfica da seção "Tokens extraídos do Figma" do CLAUDE.md.
- Adicione as fontes Baloo 2 (Bold) e Nunito Sans (Regular/Bold) com npx expo install (@expo-google-fonts/baloo-2 e @expo-google-fonts/nunito-sans). Antes, consulte docs/dependency-status.md.
- Crie um ThemeProvider + hook useNomiTheme() com preferência 'system' | 'light' | 'dark' (padrão 'system'), e use-o no _layout e no StarterScreen no lugar de useColorScheme direto.

Referência visual: as imagens das telas estão em docs/referencias/figma/09-perfil-preferencias/ (versões -light e -dark). Use-as para conferir as cores.

Fora do escopo: componentes, navegação e telas novas.
Critérios: as telas atuais continuam funcionando nos dois temas; typecheck, expo install --check e os dois exports passam.
Branch curta a partir da master; abra o PR descrevendo o que foi validado e o que não foi.
```

### Prompt 2 · Componentes base

```
Repositório: nomi-corporate/nomi-mobile. Leia CLAUDE.md e AGENTS.md antes de começar.

Issue: procure uma issue aberta com o título "[Perfil] Componentes base de interface". Se não existir, crie-a com o escopo abaixo e os critérios de aceite, e referencie-a no PR (Refs #N). Depende da issue "[Perfil] Base de design: tokens, fontes e tema".

Escopo: crie em src/components/ os componentes da tabela "Componentes" do CLAUDE.md: ScreenHeader, Field, Button (primary, secondary, disabled, loading), NavRow, OptionCard (com estado selected), ProfileSummary, SectionLabel, MainNavBar e Icon. Exporte os ícones como SVG e use react-native-svg instalado via npx expo install.
- Medidas, raios, bordas, sombras e tipografia: seção "Tokens extraídos do Figma" do CLAUDE.md.
- Referência visual: as imagens estão em docs/referencias/figma/09-perfil-preferencias/. Compare cada componente com os PNGs -light e -dark.
- Cada componente: tema via useNomiTheme(), accessibilityRole/Label, toque ≥ 44, suporte a fonte grande.
- Crie uma rota de catálogo só em desenvolvimento (ex.: src/app/dev/components.tsx, fora de produção) mostrando todas as variantes nos dois temas.

Fora do escopo: navegação e telas de perfil.
Critérios: catálogo confere com os PNGs; typecheck, expo install --check e exports passam.
```

### Prompt 3 · Navegação

```
Repositório: nomi-corporate/nomi-mobile. Leia CLAUDE.md e AGENTS.md antes de começar.

Issue: procure uma issue aberta com o título "[Perfil] Navegação principal Hoje/Agenda/Grupos/Menu". Se não existir, crie-a com o escopo abaixo e os critérios de aceite, e referencie-a no PR (Refs #N). Depende da issue "[Perfil] Componentes base de interface".

Escopo: substitua as abas Início/Matérias/Perfil pela estrutura da seção "Rotas" do CLAUDE.md: (tabs) com MainNavBar como tabBar customizada (Hoje, Agenda, Grupos, Menu), placeholders para Hoje/Agenda/Grupos e uma Stack em (tabs)/menu com as 7 rotas vazias por enquanto.
Referência visual: a barra inferior aparece em docs/referencias/figma/09-perfil-preferencias/09.01-perfil-light.png e -dark.png (aba Menu ativa).
Remova ou adapte subjects.tsx e profile.tsx sem perder conteúdo útil; explique no PR.

Critérios: a navegação entre as 4 abas e dentro do Menu funciona no web e no Android; a aba ativa fica destacada; typecheck e exports passam.
```

### Prompt 4 · Telas estáticas

```
Repositório: nomi-corporate/nomi-mobile. Leia CLAUDE.md e AGENTS.md antes de começar.

Issue: procure uma issue aberta com o título "[Perfil] Telas de perfil e preferências (interface)". Se não existir, crie-a com o escopo abaixo e os critérios de aceite, e referencie-a no PR (Refs #N). Depende da issue "[Perfil] Navegação principal Hoje/Agenda/Grupos/Menu".

Escopo: monte as 7 telas (09.01 a 09.07) nas rotas de (tabs)/menu usando SOMENTE os componentes de src/components.
- Referência obrigatória: as imagens estão em docs/referencias/figma/09-perfil-preferencias/. Reproduza cada uma nas versões -light e -dark.
- Use dados simulados num único arquivo, claramente marcado como simulado (ex.: src/features/profile/mock.ts). Nada de chamadas HTTP.
- Aplique as decisões da seção "Decisões em aberto" do CLAUDE.md: aba Menu ativa em todas as telas; Aparência com cartão selecionável; Dispositivos com textos para Android/Wear OS; "Exportar ou excluir dados" só informativo.
- Ligue a navegação: Perfil → Editar perfil, Aparência, Privacidade; Configurações → Aparência, Lembretes, Privacidade; botões Cancelar/Voltar retornam.
- "Sair da conta" fica desativado com indicação de que depende da sessão (HU-103).

Critérios: cada tela confere com o PNG correspondente nos dois temas; funciona com fonte grande; typecheck e exports passam. Inclua no PR prints lado a lado com os PNGs.
```

### Prompt 5 · Perfil e aparência com API

```
Repositório: nomi-corporate/nomi-mobile. Leia CLAUDE.md e AGENTS.md antes de começar.

Issue: procure uma issue aberta com o título "[Perfil] Integrar perfil e aparência com GET/PATCH /me". Se não existir, crie-a com o escopo abaixo e os critérios de aceite, e referencie-a no PR (Refs #N). Depende da issue "[Perfil] Telas de perfil e preferências (interface)".

Escopo:
- src/features/profile/api.ts: GET /me e PATCH /me (displayName, theme, locale, timeZone), conforme a seção 14.2 da TEC-003, com ETag/If-Match e tratamento de 412 (conflito de versão) sem sobrescrever em silêncio.
- Hook useProfile() com estados carregando, erro com nova tentativa, sucesso e conflito.
- Editar perfil (09.02): e-mail só leitura; nome com 1 a 100 caracteres; locale pt-BR; timeZone IANA válido. Só mostrar sucesso após a resposta da API.
- Aparência (09.04): aplica o tema na hora via ThemeProvider e persiste com PATCH /me (theme: system | light | dark).
- Base URL via src/config (EXPO_PUBLIC_*). Sem segredos.
Referência visual: as imagens estão em docs/referencias/figma/09-perfil-preferencias/ (09.01, 09.02 e 09.04).

Se o endpoint ainda não existir no nomi-academic, use um adapter falso marcado como simulado e deixe isso explícito no PR. A simulação não conta para os critérios de aceite.
Critérios: casos de sucesso, validação, erro de rede e conflito cobertos; typecheck e exports passam.
```

### Prompt 6 · Lembretes com API

```
Repositório: nomi-corporate/nomi-mobile. Leia CLAUDE.md e AGENTS.md antes de começar.

Issue: procure uma issue aberta com o título "[Perfil] Integrar preferências de lembretes". Se não existir, crie-a com o escopo abaixo e os critérios de aceite, e referencie-a no PR (Refs #N). Depende da issue "[Perfil] Telas de perfil e preferências (interface)".

Escopo:
- src/features/notifications/api.ts: GET e PUT /api/v1/notification-preferences com If-Match, conforme a TEC-003. As preferências começam desativadas.
- Tela Lembretes (09.07): ligar/desligar lembretes; antecedências (positivas, únicas, até 3, até 30 dias); horário para prazos sem hora (pode ser nulo); atalho para as configurações do sistema para a permissão do aparelho (não pedir permissão silenciosamente).
- Hook useReminderPreferences() com carregando, erro com nova tentativa, conflito 412 e sucesso só após confirmação da API.
Referência visual: as imagens estão em docs/referencias/figma/09-perfil-preferencias/09.07-lembretes-light.png e -dark.png.

Se o endpoint ainda não existir no nomi-notifications, use um adapter falso marcado como simulado e deixe isso explícito no PR.
Critérios: validações e estados cobertos; typecheck e exports passam.
```
