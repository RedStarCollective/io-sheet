# Google Sheet bridge

`Code.gs` goes into Oak's Google Sheet (Extensions → Apps Script) and is deployed as a Web app
(Execute as: Me, Who has access: Anyone). Its `/exec` URL is set as `SHEET_API` in `index.html`.

- GET returns the display values of three tabs: Stats & Skills Iō, Skill Improvements, Skill Improvement Calculator.
- POST `{key, type:"pharma", items:[{name, n}]}` writes dose counts under the "Pharma" list. Needs the `EDIT_KEY` script property.

Unlock dose counters on a device by visiting the site once with `?key=YOUR_EDIT_KEY`.
