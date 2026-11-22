# Autenticação mobile

Entrega local em revisão da identidade Google e e-mail/senha do Nomi. Relaciona-se à [TEC-003 seção 14.1](https://github.com/nomi-corporate/nomi-academic/blob/master/docs/TEC-003-contratos-api-eventos-v1.md#141-cadastro-e-sessão); o contrato precisa ser atualizado antes da integração dos serviços.

## Fluxo

1. `NativeGoogleGateway` abre o seletor nativo de contas no Android e obtém um ID token Google para o cliente Web público configurado.
2. `NomiIdentityClient` envia esse token por HTTPS para `POST /v1/auth/google` no serviço Identity. O serviço valida o token e devolve tokens opacos do Nomi.
3. `SessionManager` mantém o acesso em memória e guarda apenas o token de renovação no SecureStore. Ao reabrir o app, renova antes de liberar telas privadas.
4. Renovação gira os dois tokens. Saída apaga o token local e pede revogação no Identity; falha remota é mostrada sem declarar saída total.

Cadastro e entrada por e-mail usam `POST /v1/auth/register/start` e `POST /v1/auth/login`. O cadastro exige e-mail válido, nome opcional e senha entre 10 e 128 caracteres com letras e números. A confirmação usa `POST /v1/auth/register/confirm` e o reenvio usa `POST /v1/auth/register/resend`.

Recuperação usa `POST /v1/auth/password/recovery/start`, `POST /v1/auth/password/recovery/verify` e `POST /v1/auth/password/reset`. Códigos expiram em 15 minutos e têm no máximo cinco tentativas. Em desenvolvimento, o Identity registra o código no log local através do adapter de entrega; fora de desenvolvimento, ele não retorna o código pela API e requer um provedor de e-mail configurado.

A senha é armazenada como hash PBKDF2-SHA256 com salt aleatório, nunca em texto puro. E-mail já usado por conta Google ou conta Nomi não é vinculado automaticamente.

O ID token Google não é salvo pelo aplicativo. O Identity usa o `sub` do Google para localizar o usuário interno; e-mail igual não vincula contas automaticamente. O Nomi não recebe a senha Google. O fluxo não usa Cognito nem navegador de login. O código alterado ainda não está implantado; o login por e-mail só funcionará após atualizar o serviço Identity.

## Configuração

Copie `.env.example` para `.env`. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` é o cliente Web do projeto Google Cloud; o cliente Android deve cadastrar `com.nomi.app` e a impressão SHA-1 da build que será testada. `EXPO_PUBLIC_IDENTITY_API_URL` deve ser a origem HTTPS real do serviço Identity. Ambos são identificadores públicos; nunca coloque segredo ou senha em `EXPO_PUBLIC_*`.

O pacote `@react-native-google-signin/google-signin` requer build nativa; Expo Go não carrega o módulo. Na configuração Android sem Firebase, a biblioteca é vinculada automaticamente pelo React Native. O plugin Expo do pacote altera a URL de retorno do iOS e exige um cliente iOS, que ainda não existe para este projeto Android. Quando houver suporte a iOS, crie esse cliente e configure o plugin. O Android usa a API original do pacote, cuja implementação Google Android foi descontinuada pelo Google; avaliar migração para Credential Manager antes de distribuição de produção.

## Verificação

Execute `npm ci`, `npm run typecheck`, `npm test`, `npx expo install --check` e `npm run export:android`. Esses checks verificam tipos, sessão, respostas da API e bundle; não comprovam o SDK nativo, assinatura Android ou login Google real. É preciso gerar uma build Android, instalar no emulador com Google Play Services e testar entrada, cancelamento, reabertura, renovação, falta de rede e saída. O Identity precisa estar acessível por HTTPS nesse teste.

No Windows, usar um clone em caminho curto, por exemplo `C:\nomi-mobile`: o build CMake/Ninja das dependências pode ultrapassar o limite de caminhos mesmo quando o TypeScript e os bundles passam. Configure `JAVA_HOME` e `ANDROID_HOME` para o JDK/SDK instalados. Não alterar versões do SDK/React Native para contornar esse erro de caminho.

O Ninja 1.10.2 incluído no CMake 3.22.1 do Android SDK não suporta caminhos longos. Na máquina Windows, instalar o pacote oficial `cmake;3.31.6` (inclui Ninja 1.12.1) e selecionar essa versão localmente, por exemplo passando `-Pandroid.cmakeVersion=3.31.6` ao Gradle. O suporte `LongPathsEnabled` do Windows também precisa estar habilitado. A seleção local evita fixar uma versão específica do Windows nos builds de outras plataformas. Conferir o executável efetivo no `CMakeCache.txt`, não somente no PATH. Ver [orientação oficial do Expo](https://docs.expo.dev/troubleshooting/windows-long-paths/).

Para escolher entre celular conectado e emulador iniciado, execute `npm run android -- --device`. O emulador precisa estar instalado e iniciado. O export Android gera bundle JavaScript, não APK. Uma build debug depende do Metro no computador e não é distribuição autônoma.

## Pendências de integração

- Implantar o Identity com HTTPS e apontar o domínio corretamente para a EC2.
- Validar uma build Android assinada com SHA-1 cadastrado no Google Cloud.
- Integrar autorização por token Nomi no Academic, Assistant e Notifications.
- Remover a credencial Cognito antiga do SecureStore de instalações anteriores quando a migração de usuários for definida.
- Atualizar TEC-003 e revisar a política de login antes de produção.
