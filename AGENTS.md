# Nomi Mobile — instruções para agentes

Branch principal: `master`. Stack: React Native, Expo, TypeScript e Expo Router. Usar Node definido em `.nvmrc` e dependências do lockfile.

## Antes de alterar
- Leia README.md, CONTRIBUTING.md, docs relevantes e .github/workflows. Verifique branch e alterações locais; preserve o trabalho dos colegas.
- Trabalhe em uma branch curta a partir da principal atualizada. Não reutilize uma branch de bootstrap já integrada para uma nova entrega.
- Relacione o trabalho a uma HU ou TEC existente, com critérios de aceite e dependências. Não invente IDs nem links.
- Contrato aprovado: [TEC-003 v0.2](https://github.com/nomi-corporate/nomi-academic/blob/master/docs/TEC-003-contratos-api-eventos-v1.md). Preserve compatibilidade; registre decisões que mudem o contrato.
- Código, modelos e workflows são evidência do que existe. Um documento aprovado não comprova implementação, deploy ou teste em dispositivo.

## HUs, tarefas e PRs
- Cada tarefa tem um responsável; uma HU com entregas em vários repositórios tem um coordenador para acompanhar o conjunto.
- Descreva no PR a HU/TEC, o problema resolvido, a parte entregue, dependências, validação e limitações. Use links completos para referências entre repositórios.
- Para cartões em rascunho no GitHub Project, referencie o link do cartão. Não converta rascunhos automaticamente.
- Use `Refs`/link simples para entregas parciais. Reserve `Closes` para issues inteiramente atendidas; não feche a HU por concluir apenas uma tarefa.
- A HU só está concluída quando todos os critérios de aceite, integrações e verificações aplicáveis estiverem atendidos.
- Mantenedores designados: `gabrielwilliandev` e `Lucas200507`. Não integrar, autoaprovar, usar bypass ou alterar proteções/acessos sem autorização para essa ação. As regras efetivas são as do GitHub; sinalize divergências com docs antigos.

## Regras comuns de implementação
- Aplicar SOLID com simplicidade: casos de uso claros e adapters nas fronteiras externas; evitar padrões e abstrações sem necessidade.
- Serviços acessam somente seus próprios dados; integração por APIs/eventos versionados. Não compartilhar entidades de domínio nem consultar tabelas de outro serviço.
- O Assistant gera propostas; o usuário confirma e o Academic revalida/persiste. Conteúdo gerado por IA é entrada não confiável.
- Identidade vem de token validado. Validar permissão sobre cada recurso e grupo; não confiar em proprietário enviado pelo cliente.
- Seguir idempotência, ETag/If-Match, erros e datas/fusos da TEC-003. Repetições não devem duplicar efeitos; prazos sem horário não viram meia-noite implicitamente.
- Não versionar segredos, tokens, áudio pessoal, .env, local.properties ou chaves de assinatura. Não registrar tokens ou conteúdo pessoal em logs.
- Não adicionar infraestrutura paga, deploy, provedor de IA ou publicação de app implicitamente. AWS e provedores externos exigem configuração por ambiente e escopo definido.
- Wear OS é o alvo atual; Apple Watch é futuro. Não criar um microsserviço por dispositivo.

## Verificação e comunicação
- Execute verificações proporcionais à alteração e os checks aplicáveis do workflow. Mudanças apenas documentais exigem revisão de consistência, links e diff; não builds completos.
- Ao implementar comportamento, cubra casos relevantes de sucesso, validação, autorização e falha. Não simule persistência ou entrega real como sucesso de produção.
- Informe o que foi validado e o que não foi. Build, mocks, bundle e liveness não equivalem a fluxo completo ou execução em aparelho.
- Explique mudanças e limitações em português; preserve nomes de código e contratos em inglês conforme as convenções existentes.

## Organização e interface
- `src/app`: rotas e composição de telas; `src/components`: componentes reutilizáveis; `src/theme`: tokens; `src/config`: configuração pública.
- Separar acesso às APIs, sessão e regras de apresentação das telas; organizar novas funcionalidades de acordo com a estrutura existente.
- Seguir o Figma Nomi: https://www.figma.com/design/VdmGhvLilFgMFDro8qt3GM?node-id=7-6.
- Preservar identidade lilás minimalista, tipografia e modos claro/escuro. Reutilizar tokens; evitar estilos duplicados e emojis decorativos sem significado.
- Entregar estados de carregamento, vazio, erro, sucesso e tentativa novamente conforme o fluxo. Incluir rótulos acessíveis e suporte ao tamanho de fonte do sistema.
- Não declarar sucesso antes da confirmação da API. Dados simulados devem ser identificados e não podem substituir integração nos critérios de aceite.
- Armazenar sessão em mecanismo seguro da plataforma; não guardar tokens em armazenamento comum ou logs.
- Variáveis EXPO_PUBLIC_* são públicas no app; nunca colocar segredos nelas. `10.0.2.2` é endereço do host para emulador Android, não para telefone físico.
- Reutilizar a chave de idempotência ao repetir a mesma intenção e tratar conflitos de versão sem sobrescrever alterações silenciosamente.
- Celular e Watch usam `com.nomi.app`. Data Layer também depende de assinatura compatível e integração nativa; não presumir que esteja implementado.
- Consultar `docs/dependency-status.md` antes de mexer nas dependências Expo; não usar audit fix --force nem trocar SDK para silenciar alertas.

## Verificações locais
Execute na raiz do repositório:

```sh
npm ci
npm run typecheck
npx expo install --check
npm run export:android
npm run export:web
```

- CI: `Typecheck and export`. Não renomear o job sem coordenar a proteção de branch.
- Para validar a interface: `npm start` ou `npm run web`. Para alterações nativas, gerar development build com `npm run android` no ambiente Android configurado.
- Exportação Android gera bundle JavaScript; não é APK nem teste de dispositivo. Não presumir compatibilidade com Expo Go.
- Alterações visuais exigem revisar os temas e estados afetados; mudanças nativas exigem verificar build e comportamento no dispositivo/emulador apropriado.
