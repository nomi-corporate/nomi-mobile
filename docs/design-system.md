# Nomi Mobile design system

Base implementada a partir do arquivo Figma `Nomi — Experiência acadêmica · Explorações v1`, página `01 · Nomi / Protótipo`.

## Referências do Figma

| Elemento | Nós | Implementação |
| --- | --- | --- |
| Tokens claro/escuro e geometria | coleções `Nomi / Light`, `Nomi / Dark`, `Nomi / Geometry` | `src/theme/tokens.ts` |
| Tipografia | estilos `Nomi / Display`, `Title`, `Heading`, `Body`, `Caption`, `Label`, `Supporting`, `Navigation` | `src/theme/typography.ts` |
| Botões | `Nomi / Button` (`14:62`) | `src/components/ui/NomiButton.tsx` |
| Campo | `Nomi / field` (`14:40`, `14:55`) | `src/components/ui/NomiTextField.tsx` |
| Item de agenda | `Nomi / item` (`14:43`, `14:58`) | `src/components/ui/NomiAgendaItem.tsx` |
| Ícones de matérias | `Nomi / Ícones de matérias` (`22:3538`) | `src/components/ui/NomiSubjectIcon.tsx` |
| Estados de feedback | `Nomi / Feedback` (`24:5820`) | `src/components/ui/NomiFeedback.tsx` |
| Estados vazios | componentes note/calendar/book/users/bell/search, claro e escuro | `src/components/ui/NomiEmptyState.tsx` |
| Marca compacta e ícone do app | `Nomi / Ícone compacto / 40` (`148:3216`) e `Nomi / Ícone do app / Rosto frontal` (`148:2819`) | `NomiCompactMark.tsx`, `NomiAppIcon.tsx` |
| Avatar sem foto | `Avatar de fallback` (`27:8373`) | `NomiAvatarPlaceholder.tsx` e `avatar-placeholder.svg` |
| Mascote | `Nomi / Mascote / Poses` (`148:2818`), saudando `148:2648` | `src/components/brand/NomiMascot.tsx` |

## Assets

Os SVGs em `src/assets/design-system/` foram exportados dos nós vetoriais do Figma e são importados como componentes por `react-native-svg-transformer`. Foram preservadas variantes claras/escuras para wordmark, ícones de matérias, ilustrações de estados vazios e feedback. Os arquivos originais exportados do Figma continuam disponíveis junto aos componentes.

O SVG do ícone do app é renderizado sem máscara/clip path no componente React Native; o wrapper mantém as dimensões e recorta os cantos arredondados. Isso evita que o ícone apareça reduzido/quebrado na galeria Web.

As fontes variáveis Baloo 2 e Nunito Sans estão em `src/assets/fonts/` com seus arquivos OFL. `src/app/_layout.tsx` declara os intervalos variáveis (`400–800` para Baloo 2 e `200–1000` para Nunito Sans) e, no navegador, aguarda `document.fonts.load()` para os pesos usados antes de esconder a splash. A galeria também exibe o resultado do carregamento real das duas fontes. Isso evita considerar apenas a regra `@font-face` registrada como prova de que a face já foi baixada.

O vetor estático `saudando` é fallback visual; a referência animada é a instância `Nomi · Saudando` (`15:45`) dentro de `01.01 · Boas-vindas / Light` (`15:30`), na seção `00 · Mobile · Implementadas` (`211:8175`), com timeline de 3,2 s. Os GIFs antigos `nomi-saudando.gif` e `nomi-movimento.gif` não correspondem à referência. O app Android atual carrega `nomi_mascots.riv` pelo runtime Rive/Nitro; a validação no emulador confirmou os pacotes nativos, artboard e state machine carregados, além de movimento entre capturas. O fallback vetorial continua disponível para erro de runtime e Web. A validação é do Android debug x86_64; iOS e release ainda precisam de build e conferência.

## Tokens e detalhe a reconciliar

As cores claro/escuro seguem as variáveis atuais do Figma. A geometria do botão tem uma divergência no arquivo: o token `buttonRadius` declara 19 px, enquanto as variantes visuais do componente têm raio de 16 px. O código usa 16 px, que é o valor renderizado no componente.

## Componentes disponíveis

Importe do barrel `@/components` ou dos subdiretórios `brand` e `ui`: `NomiText`, `NomiButton`, `NomiTextField`, `NomiCard`, `NomiAgendaItem`, `NomiSubjectIcon`, `NomiEmptyState`, `NomiFeedback`, `NomiThemeOptions`, `NomiAvatarPlaceholder`, `NomiLogo`, `NomiCompactMark`, `NomiAppIcon` e `NomiMascot`.

`NomiThemeProvider` resolve o tema do sistema e permite sobrescrever claro/escuro durante a prévia. Os componentes reutilizáveis e as telas atuais leem o mesmo tema. Em desenvolvimento, `npm run web` abre a galeria em `/dev/components`; ela inclui os campos de e-mail normal, focado, com erro e desabilitado, o app icon atual e o avatar de fallback. Em produção, a rota redireciona para o início. As variantes antigas de wordmark foram removidas do fluxo ativo; `NomiLogo` usa os SVGs vetoriais atuais do Figma.

Os arquivos antigos `app-icon-24.svg`, `app-icon-32.svg` e `app-icon-40.svg` não representam a marca atual e não são usados pelos componentes. A galeria mostra agora o símbolo de três pintas e o rosto frontal exportados dos nós atuais do Figma.

As telas atuais de autenticação, cadastro inicial, matérias e perfil agora usam a biblioteca compartilhada para texto, campos, botões, cartões, itens e estados. A galeria exibe também a variante terciária do botão. Os componentes de agenda e ícone de matéria são usados na lista de matérias; estados vazios/feedback aparecem onde há resultados e carregamentos; avatar substitui o espaço de perfil sem foto.

Os frames atuais `09.01 · Perfil / Light` e `/ Dark` (`18:1605`, `18:1648`) foram movidos para `00 · Mobile · Implementadas` após a atualização da tela de Perfil: o avatar, seletor de tema, estado de privacidade e saída da conta usam componentes/tokens compartilhados. O seletor `NomiThemeOptions` também é reutilizado no Menu. O app não recebe nome/e-mail pelo estado de sessão; por isso a tela não mostra dados pessoais e deixa edição/controles de privacidade indisponíveis até a integração de perfil. O frame `15.07 · Professores / Light` e `/ Dark` (`115:1513`, `115:1514`) também foi movido para a seção; a tela lista, cadastra, edita e arquiva via Academic, exibe vínculo a matérias e segue o tema/token. O código exporta e a rota abre, porém a API local estava offline, então as mutações não foram verificadas no PostgreSQL; a comparação pixel a pixel segue pendente. Agenda e grupos ainda não têm endpoints disponíveis. O onboarding de voz/texto ainda contém passos de demonstração com conteúdo fixo. HUs continuam abertas.
