# Dependências da base

Expo SDK 58 foi gerado pelo template oficial e as dependências compatíveis foram verificadas com `expo install --check`. Node 24 e o lockfile ficam versionados.

Na instalação em 04/11/2026, `npm audit` reportou 5 entradas moderadas na cadeia de ferramentas Expo (glob/minimatch e dependentes). A sugestão automática envolve trocar a versão principal do Expo. Não foi aplicada uma troca incompatível nem um override de major transitivo sem validação.

Revisar atualizações oficiais e acompanhar GHSA-3g3m-2fjr-6pw4 e GHSA-g3hv-75wg-m249 antes de distribuir uma versão de produção. As validações de tipos e bundles não substituem a revisão dessas dependências.

Em 09/11/2026, a autenticação adicionou `expo-auth-session`, `expo-web-browser`, `expo-crypto` e `expo-secure-store` pelas versões compatíveis selecionadas por `expo install` no SDK 58. `@types/node` 24 foi adicionado para os testes do ciclo de sessão no Node definido em `.nvmrc`. A instalação continuou reportando as 5 entradas moderadas existentes; nenhum `audit fix --force` ou override foi aplicado.
