# Integração e entrega — nomi-mobile

## Escopo e rastreabilidade

Esta entrega estrutura a parte de CI da [TEC-007 — CI/CD](https://github.com/orgs/nomi-corporate/projects/1/views/1?pane=issue&itemId=292993590). Ela não conclui o CD nem a TEC inteira.

Branch principal: `master`. Cada alteração entra por branch e PR associado à HU/TEC, com responsável, parte entregue, dependências e evidências. Uma HU que atravessa repositórios só termina após validar a entrega completa.

Os mantenedores designados são `gabrielwilliandev` e `Lucas200507`. Autorizações excepcionais e proteções são configuradas no GitHub; este documento não as altera. Conferir as regras efetivas antes de integrar. Não falsificar checks nem desabilitar proteções para fazer o pipeline passar.

## Disparos e segurança

- PRs destinados a `master`, pushes em `master` e execução manual em Actions. A execução manual passa a aparecer quando o workflow estiver na branch principal.
- Não há filtro por caminho: uma alteração documental também publica os checks obrigatórios, evitando estados Expected indefinidos.
- Novos commits cancelam execuções anteriores do mesmo PR. Execuções já iniciadas da principal não são canceladas automaticamente; a fila de concurrency pode substituir execuções ainda pendentes.
- Token com `contents: read`; checkout sem persistir credenciais. Nenhum job recebe credenciais AWS ou publica em registry, loja ou hospedagem.
- Actions fixadas por SHA. Para atualizar, conferir a origem e o commit da versão desejada, atualizar os pins e executar os checks.
- O job `Workflow lint` valida todos os YAMLs com actionlint 1.7.12, cujo binário é conferido por SHA-256.
- Não usar `pull_request_target` para executar código de PR. Runners são hospedados no GitHub; não executar contribuições externas em máquina pessoal com segredos.

## Pipeline atual

Workflow `Mobile CI`:
- `Typecheck and export`: npm ci pelo lockfile, TypeScript, compatibilidade de dependências Expo, script `test` se configurado e exportações Android/web.
- `Workflow lint`: valida os workflows.

O check obrigatório `Typecheck and export` mantém seu nome. Recomenda-se tornar `Workflow lint` obrigatório por configuração separada.

A suíte `npm test` executa testes finitos com o test runner do Node 24 e portas injetadas para a sessão e o cliente OAuth. O workflow existente já a executa no job `Typecheck and export`. Typecheck, testes isolados e exportação não comprovam o fluxo real no dispositivo.

## Pacotes gerados

Artefatos separados `nomi-mobile-android-bundle-<SHA>-<tentativa>` e `nomi-mobile-web-<SHA>-<tentativa>`, com build.json e retenção de 7 dias.

O Android exportado é bundle JavaScript: não é APK/AAB, não é assinado para distribuição e não instala sozinho no celular. A exportação web é estática; a pipeline não publica um site nem torna o app web a plataforma principal.

EXPO_PUBLIC_* fica visível no app e nos bundles. Não há injeção de segredos. A integração Cognito dev está descrita em [autenticação](authentication.md); distribuição exige configurar o ambiente escolhido e validar login em aparelho. As APIs ainda precisam validar os tokens e implementar autorização.

## Próxima etapa de entrega mobile

Adicionar build nativo Android com o Expo/SDK do projeto, testes em aparelho/emulador e assinatura protegida antes de distribuir. Escolher entre build local no runner e serviço de build após revisar compatibilidade, custos e acesso. Não presumir EAS, Expo Go, conta de loja ou publicação configurados.

Deploy dos microsserviços na AWS é independente da distribuição mobile. Não usar credenciais AWS dentro do aplicativo.

## Identidade e artefatos

Os nomes incluem o SHA testado e a tentativa da execução. Em PR, `github.sha` identifica o merge de teste do GitHub; não confundir esse valor com o último commit da branch de origem. `build.json` registra repositório, SHA, execução e tentativa.

Artefatos servem para inspeção e reaproveitamento técnico. Um artefato de PR não é uma release confiável para implantação. Para promover, usar uma execução bem-sucedida de push da branch principal, conferir origem, SHA e ambiente. A retenção curta não é armazenamento permanente de releases.

A indisponibilidade do upload de um artefato obrigatório falha o job, mesmo que o build tenha passado. Se atingir a cota de artefatos, revisar armazenamento e retenção; não mascarar a falha.

## Referências

- [Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Artefatos de workflow](https://docs.github.com/en/actions/tutorials/store-and-share-data)
