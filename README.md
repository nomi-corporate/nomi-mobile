# Nomi Mobile

Base React Native + Expo SDK 58 + TypeScript, com Expo Router, navegação Início/Matérias/Perfil e tokens lilás para tema claro/escuro. A interface inicial é de estruturação; os fluxos completos do Figma serão implementados nas próximas HUs.

## Executar

Use Node 24 e npm. O lockfile é versionado.

```sh
npm ci
npm start
```

Copie `.env.example` para `.env` se for integrar serviços locais. Esses valores são públicos no binário; segredos ficam nos serviços. Em aparelho físico, configure o endereço da máquina acessível na rede; `10.0.2.2` se aplica ao emulador Android.

```sh
npm run typecheck
npm run export:android
npm run export:web
npm run android
```

`android` exige JDK e Android SDK e gera o projeto nativo localmente. Exportar Android verifica o bundle JavaScript; não produz APK nem comprova execução em aparelho. Use uma development build compatível com SDK 58; não presumir compatibilidade com a versão instalada do Expo Go.

## Estrutura

- `src/app`: rotas e composição de telas.
- `src/components`: componentes reutilizáveis.
- `src/theme`: tokens claro/escuro.
- `src/config`: configuração pública por ambiente.

APIs, Cognito, voz e armazenamento seguro serão adapters por funcionalidade. Integração Wear OS exige módulo Android e build nativo. Os aplicativos Android do celular e relógio usam `com.nomi.app`; assinatura compatível será configurada na entrega para comunicação Data Layer. Não há sessão ou dados acadêmicos simulados como persistidos.

## CI

GitHub Actions instala pelo lockfile, verifica TypeScript, compatibilidade de dependências Expo e exporta bundles Android e web. Build nativo, assinatura e distribuição serão adicionados na TEC-007.
