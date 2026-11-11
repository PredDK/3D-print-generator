# 3D-print generator

Parametriske modeller til 3D-print, der kører direkte i browseren. Vælg mål og indstillinger, se modellen i 3D, og download STL-filer klar til slicer.

**Prøv den:** https://preddk.github.io/3D-print-generator/ (når GitHub Pages er slået til, se nedenfor)

## Faner

| Fane | Hvad den laver |
|---|---|
| **Æske** | Æske med låg og hængsel, der printes samlet i ét stykke (print-in-place). Indvendig kant, klik-lås, greb, tekst på låg og/eller forside, magneter til stabling og frit placerbare skillevægge. |
| **Skuffer** | Skuffereol med 1–6 skuffer. Greb (fingerhul, kant eller håndtag), stop, etiketter og rumopdeling. Kan hænge på IKEA SKÅDIS. |
| **Holder** | Vægholder eller stående blok med huller i forskellige størrelser og former, fx til tandbørster, knive eller værktøj. Tilspidsede huller, drypbakke og montering med skruer, tape eller SKÅDIS. |
| **Kabel** | Kabelclips til bordkanten eller væggen, og kabelbøjle til et helt bundt (kammer med klik-spalte forneden). Montering med 1–2 skruer, magneter, tape, SKÅDIS eller bordkant-klemme. |
| **Stikdåse** | Holdere til stikdåser: enkelte bøjler, en samlet holder (2 bøjler forbundet med en bjælke) eller en skrå stander med clips. Mål efter din egen dåse. Montering med SKÅDIS-kroge, skruehuller, magneter, bordkant-klemme eller ingenting. |
| **Lys** | Fyrfadsholder med stilk til ler/oasis eller med øskner til ståltråd. Almindelige eller maxi-fyrfadslys, flere stk. i samme fil. |
| **Indsats** | Indsatser med slidser til USB-A, USB-C, micro-USB, SD- og microSD-kort. Kan tilpasses til en skuffe eller æske. |

Alle mål er i mm.

## Print

- Hver model ligger i den retning, den skal printes. Der skal ikke bruges support, medmindre det står ved en indstilling (fx SKÅDIS-krog i midten på kabelclips).
- **Æske:** printes åben ved 180° med bund og låg fladt på pladen. Print testhængslet først for at finde den rigtige frigang til din printer.
- **SKÅDIS:** krogene sidder fast på modellen. Holder og skuffeskab printes derfor på hovedet med toppen på printpladen. Pladen regnes som 5 mm tyk, og det kan justeres.
- **Lys:** udgaven med stilk printes på hovedet, og bunden bygges som en bro. Brug LED-fyrfadslys. Levende lys kan gøre PLA blødt, så brug i så fald PETG eller ASA, og lad aldrig lyset brænde uden opsyn.
- **Magneter:** de fleste modeller kan få huller til runde magneter på monteringsfladen. Hullerne er åbne mod fladen, så magneterne limes i.
- Er noget for stramt eller løst, så justér frigangen. Printerprofilerne giver et godt udgangspunkt.

## Gem og del

- **Gem:** gemmer opsætninger i din egen browser.
- **Delekode:** kopiér en kode, som en anden kan indlæse. Den åbner automatisk den rigtige fane.
- **Direkte link til en fane:** fx `#skuffer`, `#holder`, `#kabel`, `#indsats`, `#lys`, `#stik`.

## Kode

`index.html` er hele programmet i én fil, uden byggetrin og uden afhængigheder ud over [three.js](https://threejs.org/), som hentes fra cdnjs.

Kildekoden ligger opdelt i `src/`:

- `src/geom.js` – geometri-motor (polygoner, ekstrudering, triangulering) og æsken
- `src/tools.js` – skuffer, holder, kabelclips, indsats og SKÅDIS-kroge
- `src/app.js` – brugerflade, 3D-visning, download og gem/del
- `src/shell.html` – HTML og CSS

Efter ændringer i `src/` samles `index.html` med:

```
python3 build.py
```

## Slå GitHub Pages til

1. Gå til **Settings → Pages** i dette repository.
2. Under **Build and deployment** vælg **Deploy from a branch**.
3. Vælg branch `main` og mappe `/ (root)`, og tryk **Save**.
4. Efter et minuts tid er siden klar på adressen ovenfor.
