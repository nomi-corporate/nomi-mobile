# IntegraÃ§Ã£o e entrega

## PolÃ­tica pretendida para master

- Branch principal: `master`.
- Todos trabalham em branches `feat/`, `fix/` ou `chore/` e abrem pull requests.
- Apenas gabrielwilliandev e Lucas200507 podem integrar mudanÃ§as na master.
- Exigir ao menos uma revisÃ£o de outro colaborador, resolver conversas e passar nos checks obrigatÃ³rios.
- Invalidar aprovaÃ§Ãµes quando novos commits forem enviados.
- Aplicar verificaÃ§Ãµes tambÃ©m aos administradores; sem bypass, force push ou exclusÃ£o da master.
- CODEOWNERS exige revisÃ£o quando habilitado nas regras; sozinho nÃ£o restringe quem faz merge.

Esta polÃ­tica NÃƒO estÃ¡ aplicada pelo conteÃºdo deste arquivo. Configurar as regras no GitHub apÃ³s criar o remoto. ResponsÃ¡veis definidos: gabrielwilliandev e Lucas200507. A organizaÃ§Ã£o ainda precisa ser criada.

A restriÃ§Ã£o de quem pode enviar alteraÃ§Ãµes Ã  branch protegida Ã© oferecida para organizaÃ§Ãµes, conforme o plano e a visibilidade. Em repositÃ³rios privados, verificar GitHub Team ou os recursos do plano disponÃ­vel. NÃ£o substituir proteÃ§Ã£o por uma simples verificaÃ§Ã£o de nome de usuÃ¡rio no workflow.

## CI/CD

O workflow `Mobile CI` instala pelo lockfile, verifica tipos e dependências Expo e exporta bundles Android e web. Exportação não é compilação nativa nem teste em aparelho.

Para CD: executar apÃ³s merge aprovado em master, produzir artefato identificado pelo commit e usar ambientes separados. Autenticar na AWS com OIDC e permissÃµes mÃ­nimas por repositÃ³rio/ambiente, sem chaves AWS permanentes no GitHub. ProduÃ§Ã£o e aprovaÃ§Ã£o de deploy dependerÃ£o dos recursos do plano. Deploy ainda nÃ£o foi configurado.

## ReferÃªncias

- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
