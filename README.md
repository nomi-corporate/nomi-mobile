# Nomi Mobile

Base React Native + Expo SDK 58 + TypeScript, com Expo Router, autenticação pelo Nomi Identity, navegação protegida e tokens lilás para tema claro/escuro. As telas de primeiro acesso seguem os frames do Figma, incluindo o mascote `Nomi · Saudando`; o onboarding acadêmico inicial cobre permissões, cadastro, revisão, edição e estado de semestre pronto.

## Executar

Use Node 24 e npm. O lockfile é versionado.

```sh
npm ci
npm start
```

Copie `.env.example` para `.env` se for integrar serviços locais. Esses valores são públicos no binário; segredos ficam nos serviços. Em aparelho físico, configure o endereço da máquina acessível na rede; `10.0.2.2` se aplica ao emulador Android.

```sh
npm run typecheck
npm run export:android
npm run export:web
npm run android
```

### Galeria visual de componentes

Durante o desenvolvimento, execute `npm run web` e abra `http://localhost:8081/dev/components` para visualizar tokens, tipografia, marca, mascotes, botões, campos e estados. O seletor no topo alterna entre tema claro, escuro e sistema. Em builds de produção, a rota redireciona para o início.

### Android local no Windows

Para evitar o limite de caminho do CMake/Ninja no Windows, use o runner local:

```powershell
npm run android:local
```

Ele configura o JDK do Android Studio, valida o SDK/ADB, sincroniza o código para `C:\n` (somente para compilação), gera `C:\n\android\app\build\outputs\apk\debug\app-debug.apk` e instala/abre automaticamente quando há um emulador online. O código editável continua em `C:\Users\Willian\Desktop\Nomi\nomi-mobile`.

Com um celular conectado por USB (depuração USB ativada), o script detecta a arquitetura do aparelho (`arm64-v8a` na maioria dos celulares) e compila para ela; sem aparelho ou no emulador, usa `x86_64`. Para forçar, use `-Architecture arm64-v8a`. Depois de mudar `app.json` (ícone, permissões ou plugins), rode `npx expo prebuild --platform android --no-install` antes do `-Rebuild`, porque a pasta `android/` é gerada.

O comando reutiliza o APK existente e inicia o Metro na pasta original do código, com `adb reverse` na porta 8081. Alterações de telas/TypeScript aparecem pelo Metro. Após alterações nativas, use `npm run android:local -- -Rebuild` para recompilar. O espelho curto é usado somente pelo Gradle: executar o Metro nele pode duplicar a inicialização do React Native.

Se já houver um Metro canônico em outra porta, use `npm run android:local -- -MetroPort 8083`. Para reconectar o APK instalado sem recompilar ou reinstalar, execute `./scripts/connect-android-metro.ps1 -MetroPort 8083`. O helper confere a raiz servida no manifesto Expo e as URLs públicas de Identity/Academic incorporadas no bundle, comparando com a configuração local atual. Em seguida, alinha o host Android salvo com o redirecionamento ADB. Ele preserva a sessão e recusa um Metro de outra cópia ou com ambiente desatualizado; informe `-Serial` se houver vários dispositivos.

`android` exige JDK e Android SDK e gera o projeto nativo localmente. Exportar Android verifica o bundle JavaScript; não produz APK nem comprova execução em aparelho. Use uma development build compatível com SDK 58; não presumir compatibilidade com a versão instalada do Expo Go.

## Estrutura

- `src/app`: rotas e composição de telas.
- `src/components`: componentes reutilizáveis.
- `src/theme`: tokens claro/escuro.
- `src/config`: configuração pública por ambiente.

O login Google nativo e o acesso por e-mail/senha usam o serviço Nomi Identity para validar a conta e emitir sessões próprias. Consulte [autenticação](docs/authentication.md) para configuração, limites e validação no aparelho. O onboarding acadêmico é atualmente uma prévia local: voz, permissões e persistência no serviço Academic ainda serão conectadas. Integração Wear OS exige módulo Android e build nativo. Os aplicativos Android do celular e relógio usam `com.nomi.app`; assinatura compatível será configurada na entrega para comunicação Data Layer. Não há dados acadêmicos simulados como persistidos.

As abas Hoje e Agenda consultam compromissos persistidos no Academic usando o fuso do perfil. Em Hoje, o Android grava até 60 segundos de áudio M4A, envia o arquivo privado ao S3 por uma URL temporária fornecida pelo Assistant e recebe a transcrição do Amazon Transcribe para revisão. O arquivo local é removido após o envio/processamento. Também é possível preencher o formulário por texto quando a permissão é negada ou a transcrição falha. O usuário revisa título, descrição, tipo, matéria opcional e data antes de salvar pelo Academic; o app só informa sucesso após a resposta da API. Por enquanto o prazo é somente com data: a data falada não é interpretada automaticamente e o Assistant ainda não gera proposta de matéria ou compromisso. Aulas recorrentes ainda não estão disponíveis. Grupos permite criar, listar e consultar os próprios grupos pelo Academic; convites e materiais seguem pendentes. A transcrição precisa de bucket/role AWS, migration no Assistant, build nativa e validação em Android antes de ser considerada pronta.

## CI

GitHub Actions instala pelo lockfile, verifica TypeScript, executa `npm test`, confere compatibilidade de dependências Expo e exporta bundles Android e web. Build nativo, assinatura e distribuição serão adicionados na TEC-007.
