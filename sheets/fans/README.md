# Fan character sheets

Put a fan's sheet here and point their entry in `data/io.json` at it with a `sheet` field.

- A Foundry actor export: save it as `sheets/fans/<name>.json` and set `"sheet": "sheets/fans/<name>.json"`. The fan's file on the page gets a "Foundry sheet" download button (import it in Foundry with Import Data on a blank actor).
- A sheet that lives somewhere else (Google Sheet, PDF, Foundry link): set `"sheet": "https://..."`. The button opens it in a new tab.

Other optional fields on a fan: `link` (the gig post), `more` (a longer write-up), `roles` (e.g. `[{"role":"Solo","rank":4}]`; leave it out when the GM didn't say).
