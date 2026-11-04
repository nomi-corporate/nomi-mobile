# Arquitetura

## Responsabilidade

Interface, captura de voz, confirmação de ações e consulta à rotina. O aplicativo acessa APIs; não acessa bancos diretamente.

## Limites

O aplicativo será desenvolvido em React Native com Expo e TypeScript. Android é o foco inicial; iOS poderá ser adicionado posteriormente.

Organizar telas e casos de uso por funcionalidade. Aplicar SOLID nas responsabilidades e dependências, com adaptadores para APIs, autenticação, áudio, persistência local e dispositivos. Evitar regras de negócio e chamadas HTTP diretamente em componentes visuais.

Os microsserviços Academic, Assistant e Notifications permanecem em C#/.NET. O aplicativo se comunica por contratos de API e não acessa seus bancos de dados nem filas internas diretamente. Credenciais secretas de provedores de IA ficam no backend.

A captura por voz produz uma proposta estruturada; o usuário confirma ou corrige antes da solicitação de gravação do compromisso no Academic.

## Dispositivos

A integração RM22/Micro OS 10 será isolada do restante do aplicativo e depende de documentação e testes no aparelho. Não assumir acesso ao microfone do relógio nem instalação de um aplicativo próprio. Apple Watch é uma possibilidade futura e terá integração específica.

## Execução e entrega

O projeto Expo ainda será inicializado. Quando houver código, o CI deve instalar dependências pelo lockfile, verificar tipos, executar os testes e validar o empacotamento. Builds nativos e integração com relógios terão configuração própria; publicar na AWS o backend não instala o aplicativo no celular.

## Decisões pendentes

- Provedor de IA e transcrição.
- Protocolo e suporte real do RM22/Micro OS 10; não há promessa de app instalável.
- Serviços AWS de execução, mensageria, região e orçamento.
- Contratos HTTP e eventos e sua estratégia de versionamento.

## Design

https://www.figma.com/design/VdmGhvLilFgMFDro8qt3GM?node-id=7-6
