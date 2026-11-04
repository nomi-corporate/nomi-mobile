# Arquitetura

## Responsabilidade

Interface, captura de voz, confirmaÃ§Ã£o de aÃ§Ãµes e consulta Ã  rotina. O aplicativo acessa APIs; nÃ£o acessa bancos diretamente.

## Limites

O aplicativo serÃ¡ desenvolvido em React Native com Expo e TypeScript. Android Ã© o foco inicial; iOS poderÃ¡ ser adicionado posteriormente.

Organizar telas e casos de uso por funcionalidade. Aplicar SOLID nas responsabilidades e dependÃªncias, com adaptadores para APIs, autenticaÃ§Ã£o, Ã¡udio, persistÃªncia local e dispositivos. Evitar regras de negÃ³cio e chamadas HTTP diretamente em componentes visuais.

Os microsserviÃ§os Academic, Assistant e Notifications permanecem em C#/.NET. O aplicativo se comunica por contratos de API e nÃ£o acessa seus bancos de dados nem filas internas diretamente. Credenciais secretas de provedores de IA ficam no backend.

A captura por voz produz uma proposta estruturada; o usuÃ¡rio confirma ou corrige antes da solicitaÃ§Ã£o de gravaÃ§Ã£o do compromisso no Academic.

## Dispositivos

A integraÃ§Ã£o RM22/Micro OS 10 serÃ¡ isolada do restante do aplicativo e depende de documentaÃ§Ã£o e testes no aparelho. NÃ£o assumir acesso ao microfone do relÃ³gio nem instalaÃ§Ã£o de um aplicativo prÃ³prio. Apple Watch Ã© uma possibilidade futura e terÃ¡ integraÃ§Ã£o especÃ­fica.

## ExecuÃ§Ã£o e entrega

O projeto Expo ainda serÃ¡ inicializado. Quando houver cÃ³digo, o CI deve instalar dependÃªncias pelo lockfile, verificar tipos, executar os testes e validar o empacotamento. Builds nativos e integraÃ§Ã£o com relÃ³gios terÃ£o configuraÃ§Ã£o prÃ³pria; publicar na AWS o backend nÃ£o instala o aplicativo no celular.

## DecisÃµes pendentes

- Provedor de IA e transcriÃ§Ã£o.
- Protocolo e suporte real do RM22/Micro OS 10; nÃ£o hÃ¡ promessa de app instalÃ¡vel.
- ServiÃ§os AWS de execuÃ§Ã£o, mensageria, regiÃ£o e orÃ§amento.
- Contratos HTTP e eventos e sua estratÃ©gia de versionamento.

## Design

https://www.figma.com/design/VdmGhvLilFgMFDro8qt3GM?node-id=7-6
