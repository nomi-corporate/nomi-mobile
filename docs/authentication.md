# Autenticação mobile

Entrega parcial da [TEC-003 seção 14.1](https://github.com/nomi-corporate/nomi-academic/blob/master/docs/TEC-003-contratos-api-eventos-v1.md#141-cadastro-e-sessão). Responsável pela entrega: Gabriel (`gabrielwilliandev`). Não conclui perfil, autorização das APIs, vínculo de notificações ou a HU completa de identidade. O cliente Watch mantém uma configuração própria futura.

## Configuração

Copiar `.env.example` para `.env` e reiniciar o bundler após alterações. Os identificadores dev fornecidos pelo responsável estão no exemplo; não são segredos. Não fornecer `client_secret`, chaves AWS nem credenciais dos bancos ao aplicativo.

| Configuração pública | Uso |
| --- | --- |
| `EXPO_PUBLIC_COGNITO_DOMAIN` | Origem HTTPS dos endpoints OAuth do Cognito em Ohio |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | Identificação do ambiente e separação do armazenamento local |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID` | Cliente público específico do Mobile |

No cliente do Cognito: habilitar Authorization Code, scopes `openid email profile`, callback exato `nomi://auth/callback` e saída `nomi://auth/logout`. Não habilitar implicit ou client credentials para este aplicativo. Habilitar revogação de refresh tokens no cliente. O provedor gerencia cadastro, confirmação, recuperação e eventuais desafios MFA; o app não coleta ou persiste a senha.

## Responsabilidades

- `domain/auth.ts`: contratos de sessão, provedor e armazenamento, sem dependência de React/Expo.
- `application/SessionManager.ts`: restauração, renovação concorrente única, expiração, saída e estados de recuperação; dependências injetadas por interfaces.
- `ExpoCognitoGateway`: navegador do sistema e AuthSession com state aleatório e PKCE S256 por tentativa. O retorno é conferido novamente quanto a callback, state e código únicos antes da troca.
- `CognitoTokenClient`: troca, renovação e revogação via HTTPS, timeout de 15 segundos, respostas tipadas e mensagens sanitizadas.
- `SecureRefreshTokenStore`: somente refresh token no SecureStore, em chave separada por user pool e cliente. Access token fica apenas na memória; ID token é descartado. Não usar AsyncStorage, localStorage ou logs para tokens.
- `AuthProvider`: composição dos adapters, renovação antes da expiração e verificação ao voltar ao primeiro plano. Telas consomem estados e ações, sem chamadas ao Cognito.
- `src/app`: navegação protegida pelo Expo Router; deep link isolado não cria sessão nem troca códigos. Telas privadas exigem sessão; retorno inesperado volta à entrada.

Uma sessão restaurada só libera a área privada depois da renovação bem-sucedida. Falhas transitórias preservam o refresh token e oferecem nova tentativa; `invalid_grant` limpa a sessão e solicita login. A rotação retorna o novo refresh token, persistido antes de liberar o access token. Uma resposta antiga não pode reautenticar depois da saída. Falha no armazenamento seguro bloqueia a sessão e oferece recuperação, sem declarar sucesso.

## Saída

O aplicativo remove o token local, tenta revogar a renovação no Cognito e abre `/logout` para encerrar o cookie do navegador. Se estiver offline ou o usuário fechar o navegador antes do retorno, a tela informa que somente a saída local foi confirmada. Não promete revogação remota quando ela não foi confirmada. Validadores JWT independentes nas APIs podem continuar aceitando access tokens já emitidos até sua expiração; a autorização do backend é uma entrega separada.

Ainda não há dispositivo de notificações ou cache acadêmico privado: não existem vínculos/cache a limpar nesta entrega. Ao implementá-los, integrar sua limpeza e desvinculação ao caso de uso de saída. As telas de início e matérias continuam sendo a base inicial, sem dados persistidos.

## Executar e testar

```sh
npm ci
npm run typecheck
npm test
npx expo install --check
npm run export:android
npm run export:web
npm run android
```

Usar build Android nativa com o esquema `nomi` registrado. Expo Go não oferece o esquema personalizado necessário. O export web continua disponível como prévia: mostra que o login é exclusivo do app nesta entrega e não persiste tokens nem oferece login web.

No Windows, usar um clone em caminho curto, por exemplo `C:\nomi-mobile`: o build CMake/Ninja das dependências pode ultrapassar o limite de caminhos mesmo quando o TypeScript e os bundles passam. Configure `JAVA_HOME` e `ANDROID_HOME` para o JDK/SDK instalados. Não alterar versões do SDK/React Native para contornar esse erro de caminho.

Para escolher entre celular conectado e emulador iniciado, executar `npm run android -- --device`. O celular precisa autorizar a depuração USB; o emulador precisa estar instalado e iniciado no ambiente Android. Uma build debug depende do Metro no computador; o APK debug isolado não é uma distribuição autônoma do app. Validar nos dois destinos e registrar os resultados separadamente.

Os testes usam tokens sintéticos, portas substituídas e o cliente HTTP real com transporte injetado. Cobrem callback/state/PKCE, troca e renovação, resposta inválida, cancelamento, persistência, falha de rede, sessão expirada, concorrência e saída parcial. Não substituem a integração com Cognito e SecureStore em dispositivo.

Validação manual pendente em aparelho/emulador Android:

1. Abrir o app sem sessão: entrada disponível, sem acesso direto a `/subjects` ou `/profile`.
2. Entrar pela página Cognito usando a conta confirmada e completar MFA, se solicitado. O navegador deve retornar à área inicial do app.
3. Fechar e reabrir: restaurar sessão sem pedir senha enquanto a renovação estiver válida.
4. Cancelar o navegador: voltar à entrada com mensagem e permitir nova tentativa.
5. Reabrir sem internet: oferecer tentar novamente ou sair; ao recuperar a rede, restaurar sem recriar conta.
6. Sair no perfil: apagar sessão, concluir a saída no navegador e impedir retorno a telas privadas pelo botão Voltar.
7. Repetir com temas claro/escuro e fonte ampliada; não cortar rótulos ou esconder ações.
8. Revogar a sessão no provedor e tentar renovar: exigir novo login. Conferir comportamento da rotação conforme a configuração real do cliente.

Esses testes não precisam da EC2 ou RDS ligados; Cognito é independente. Não inserir senhas ou códigos de MFA em scripts nem enviá-los em relatórios.

## Referências

- [Expo AuthSession](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [OAuth no Expo e requisito de build nativa](https://docs.expo.dev/guides/authentication/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Cognito refresh tokens](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html)
- [Cognito logout](https://docs.aws.amazon.com/cognito/latest/developerguide/logout-endpoint.html)
- [Cognito revogação](https://docs.aws.amazon.com/cognito/latest/developerguide/revocation-endpoint.html)
