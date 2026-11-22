# Ativos do mascote para Rive

Exportação do componente `Nomi / Mascote / Poses` do Figma, componente set `148:2818`.
Cada pasta contém `pose.svg` (a pose inteira) e SVGs separados das camadas/grupos
para reconstruir o rig. Os nomes numéricos dos arquivos preservam o node ID do Figma.

| Pose | Node da pose | Pasta | Trilhas de movimento no Figma |
| --- | --- | --- | ---: |
| Saudando | `148:2648` | `nomi-saudando-source` | 8 |
| Atento | `148:2674` | `nomi-atento-source` | 7 |
| Pensando | `148:2698` | `nomi-pensando-source` | 7 |
| Comemorando | `148:2720` | `nomi-comemorando-source` | 9 |
| Ouvindo | `148:2743` | `nomi-ouvindo-source` | 10 |
| Explicando | `148:2768` | `nomi-explicando-source` | 10 |
| Dormindo | `148:2801` | `nomi-dormindo-source` | 8 |

Todas as sete poses têm timelines de 3,2 s. Os layers/alvos animados foram
consultados individualmente nas variantes em que a resposta do Figma veio paginada.
Os SVGs e `figma-mascot-source.json` preservam as origens vetoriais e as trilhas.

## Entrega Rive

- `nomi_mascots.riv`: arquivo local com os sete artboards, cada um com state machine
  em loop: Saudando, Atento, Pensando, Comemorando, Ouvindo, Explicando e Dormindo.
- `nomi-mascots/scene.rml`: cena editável usada para compilar o `.riv`.
- `scripts/Generate-RiveMascots.py`: reconstrói a cena a partir do JSON e dos SVGs.
- Runtime mobile: `@rive-app/react-native` e `react-native-nitro-modules`.
  `src/components/brand/NomiMascotAnimated.native.tsx` seleciona a pose e respeita
  redução de movimento; o componente web usa a pose SVG estática.
- Estado de integração: o componente está preparado, mas a tela de boas-vindas
  ainda usa diretamente a pose SVG estática. No emulador, o bundle falha ao
  localizar o TurboModule `NitroModules` mesmo com o APK compilado; corrigir a
  inicialização nativa antes de ativar o runtime na tela.

Para regenerar na raiz do Mobile:

```powershell
python scripts/Generate-RiveMascots.py
rive src/assets/rive/nomi-mascots --verify
rive src/assets/rive/nomi-mascots --publish=local --output-dir=..
```

O CLI registrou marca d'água no `.riv` local pelo plano atual da conta Rive.
Verifique o resultado visual e os termos do plano antes de distribuir o app.
