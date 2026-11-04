# Aplicativo Nomi

Interface, captura de voz, confirmação de ações e consulta à rotina. O aplicativo acessa APIs; não acessa bancos diretamente.

## Stack acordada

React Native, Expo e TypeScript, com foco inicial em Android e possibilidade de evolução para iOS.

A interface será organizada por funcionalidades, com componentes reutilizáveis e os tokens visuais do Nomi. Integrações com APIs, autenticação, áudio e dispositivos ficarão isoladas em adaptadores.

Infraestrutura AWS; autenticação Amazon Cognito; arquivos no S3. Cada serviço é implantado independentemente e controla seus próprios dados.

## Estado inicial

Este repositório contém a documentação e os checks iniciais. O código da aplicação, o provisionamento AWS e o deploy ainda não foram implementados.

A stack está definida; a criação do projeto Expo e dos scripts de execução, compilação e testes será a próxima etapa. A integração com RM22/Micro OS 10 ainda depende de validação técnica.

## Documentação

- [Arquitetura](docs/architecture.md)
- [CI/CD e proteção da master](docs/delivery.md)
- [Como contribuir](CONTRIBUTING.md)
