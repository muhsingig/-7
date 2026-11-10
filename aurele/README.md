# Aurèle

The maison version of the watch showpiece: black, ivory and gold, a light serif, little motion. Same procedural 3D watch as `../prahar`, recast in gold with a day and night ring and three references (yellow gold and green, steel and black, rose gold and ivory).

## Open it

- Double-click `index.html`, or
- `npm start` and open http://localhost:4174

## Edit it

Source is in `src/`; `npm run build` rebundles it into `assets/app.js`.

- `src/data.js`: the three references (metals, dial colours, prices)
- `src/watch.js`: the watch model
- `src/main.js`: scroll poses and interactions
- `index.html`, `assets/styles.css`: copy and styling

Preview switches: `?motion=reduce` for reduced motion, `?gl=off` for the no-WebGL fallback.

Fonts (self-hosted, SIL Open Font License): Cormorant Garamond, Jost. Libraries (MIT): three.js, Lenis.
Aurèle is not a real company and nothing is for sale.
