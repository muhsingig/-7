# Prahar

A showpiece site for a fictional Bombay watchmaker. The watch is a procedural real-time 3D model (three.js): every gear, bridge and finish is generated in code, the hands show the visitor's own time, and the page takes the colours of the prahar (three-hour watch of the day) it is opened in.

## Open it

- Double-click `index.html`, or
- `npm start` and open http://localhost:4173

## Edit it

Source is in `src/`; `npm run build` rebundles it into `assets/app.js` (`npm run dev` watches).

- `src/data.js`: the eight prahars (names, colours, ragas) and dial colours
- `src/watch.js`: the watch model and its mechanics
- `src/stage.js`: renderer, lighting, camera rig
- `src/main.js`: themes, loader, scroll poses, interactions
- `assets/styles.css`: all styling

Preview switches: `?prahar=1..8` forces a prahar's colours, `?motion=reduce` previews reduced motion, `?gl=off` previews the no-WebGL fallback.

## Credits

Fonts (self-hosted, SIL Open Font License): Rozha One, Anek Latin. Libraries (MIT): three.js, Lenis.
Paintings: eight pages from a Jaipur ragamala set, c. 1750-1770, Art Institute of Chicago, public domain (CC0); sources in `assets/img/credits.json`.
Prahar is not a real company and nothing is for sale.
