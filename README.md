# NFL Poule 2026-2027

Static GitHub Pages site voor de NFL poule.

## Wat zit erin?

- Wedstrijdschema per week
- Nederlandse tijden in `data.json`
- Teamkleuren per speler
- Verdubbelaars per week
- Week openen/vergrendelen
- Tussenstand als lijst
- Statistieken:
  - beste verdubbelaar
  - hoogste weekscore
  - laagste weekscore, alleen vergrendelde én ingevulde weken
  - hoogste en laagste wedstrijdscore
  - meeste thuiswins/uitwins
  - top 5 teams
  - worst 5 teams

## Belangrijk over beheer

GitHub Pages is statisch. De website kan dus niet veilig direct naar `data.json` schrijven zonder backend. Daarom werkt het beheer zo:

1. Tom logt in met admin PIN.
2. Tom wijzigt lokaal uitslagen, verdubbelaars of locks.
3. Tom downloadt onderaan de pagina de nieuwe `data.json`.
4. Tom vervangt `data.json` in GitHub.
5. Na commit is de publieke site bijgewerkt.

De knoppen voor downloaden/importeren/resetten staan bewust helemaal onderaan in een ingeklapt beheerblok.

## Admin PIN wijzigen

Open `assets/app.js` en wijzig:

```js
const ADMIN_PIN = "1904";
```

Let op: deze PIN is vooral bedoeld om casual wijzigingen te voorkomen. Zet geen echte geheimen in frontend code.
