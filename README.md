# Aplicativo Nomi

Interface, captura de voz, confirmação de ações e consulta à rotina. O aplicativo acessa APIs; não acessa bancos diretamente.

## Stack acordada

Angular, Ionic, Capacitor e TypeScript.

Infraestrutura AWS; autenticação Amazon Cognito; arquivos no S3. Cada serviço é implantado independentemente e controla seus próprios dados.

## Estado inicial

Este repositório contém a documentação e os checks iniciais. O código da aplicação, o provisionamento AWS e o deploy ainda não foram implementados.

## Documentação

- [Arquitetura](docs/architecture.md)
- [CI/CD e proteção da master](docs/delivery.md)
- [Como contribuir](CONTRIBUTING.md)
