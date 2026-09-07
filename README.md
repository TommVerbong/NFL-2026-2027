# NFL Poule 2026-2027

## Eenmalig publiceren
Upload alle bestanden met behoud van de mappenstructuur. Kies bij Settings > Pages als bron **GitHub Actions**.

## Wekelijkse score-update
1. Open de live website in je vaste beheerbrowser.
2. Log in met de admin-PIN.
3. Vul uitslagen en verdubbelaars in en vergrendel de week.
4. Klik bij Beheer op **Download pouledata.json**.
5. Ga in GitHub naar `data/pouledata.json`.
6. Verwijder het oude bestand of upload het nieuwe bestand met exact dezelfde naam.
7. Commit de wijziging naar `main`.
8. Wacht tot de Pages-workflow een groen vinkje toont.
9. Alle bezoekers laden daarna de gepubliceerde gegevens uit `data/pouledata.json`.

## Bonusvragen
- Vul als admin de vier voorspellingen per vraag in.
- Vergrendel de bonusvragen vóór de start van het seizoen.
- Download en commit daarna `pouledata.json`.
- Vul na afloop het officiële antwoord in. Exacte overeenkomsten, ongeacht hoofdletters of extra spaties, leveren 2 punten op.
- Download en commit opnieuw `pouledata.json`.

## NFL Leaders
De workflow `.github/workflows/update-nfl-leaders.yml` draait iedere dinsdag om 08:15 uur in `Europe/Amsterdam`. Handmatig starten kan via **Actions > Update NFL Leaders > Run workflow**. De workflow schrijft `data/nfl-leaders.json` en commit dit automatisch.

## Belangrijk
Gebruik voor admin-invoer bij voorkeur steeds dezelfde browser en computer. Het lokale concept blijft aanwezig tot je de gedownloade `pouledata.json` naar GitHub commit. Na publicatie zien alle bezoekers dezelfde officiële gegevens.
