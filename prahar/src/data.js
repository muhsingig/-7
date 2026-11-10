// The eight prahars: the day's four watches from sunrise, then the night's four.
// Colours are taken from the Jaipur ragamala pages shown on the site
// (vermilion mats, mint lawns, saffron text bands, night-blue skies).
export const PRAHARS = [
  {
    id: 'purvahna', name: 'Purvahna', from: 6, to: 9, ordinal: 'the first watch of the day',
    raga: 'Raga Bhairav', img: 'assets/img/1-bhairav.jpg',
    alt: 'Raga Bhairaon: a pale-skinned prince and a lady seated in a red pavilion with attendants and musicians.',
    line: 'First light. The lamp is put out and Bhairav is sung.',
    bg: '#f2b9a8', ink: '#3a0f0a', accent: '#c8321b', onAccent: '#fff4ec', dark: false,
  },
  {
    id: 'madhyahna', name: 'Madhyahna', from: 9, to: 12, ordinal: 'the second watch of the day',
    raga: 'Ragini Todi', img: 'assets/img/2-todi.jpg',
    alt: 'Ragini Todi: a woman with a vina stands on a green hill while blackbuck gather around her.',
    line: 'The sun climbs. Todi walks out with her vina and the deer come to listen.',
    bg: '#a8d9b4', ink: '#0d2a1b', accent: '#d2401f', onAccent: '#fff4ec', dark: false,
  },
  {
    id: 'aparahna', name: 'Aparahna', from: 12, to: 15, ordinal: 'the third watch of the day',
    raga: 'Ragini Dhanashri', img: 'assets/img/3-dhanashri.jpg',
    alt: 'Ragini Dhanashri: a woman paints a portrait indoors while a rider on a white horse passes below.',
    line: 'Noon heat, shutters closed. Dhanashri paints the one who is away.',
    bg: '#f2c22e', ink: '#211a03', accent: '#c12f17', onAccent: '#fff4ec', dark: false,
  },
  {
    id: 'sayamkala', name: 'Sayamkala', from: 15, to: 18, ordinal: 'the fourth watch of the day',
    raga: 'Raga Shri', img: 'assets/img/4-shri.jpg',
    alt: 'Raga Shri: a king seated on a terrace listens to two musicians in the late light.',
    line: 'The light goes long and gold. Shri is sung as the sun sets.',
    bg: '#dc5229', ink: '#230802', accent: '#fbe7c2', onAccent: '#230802', dark: false,
  },
  {
    id: 'pradosha', name: 'Pradosha', from: 18, to: 21, ordinal: 'the first watch of the night',
    raga: 'Raga Dipak', img: 'assets/img/5-dipak.jpg',
    alt: 'Raga Dipak: a couple sit together in a palace room as the evening lamps are brought.',
    line: 'The lamps are lit. Dipak is the raga said to light them.',
    bg: '#6c1a2b', ink: '#fbe6d8', accent: '#f2c22e', onAccent: '#2a1803', dark: true,
  },
  {
    id: 'nishitha', name: 'Nishitha', from: 21, to: 24, ordinal: 'the second watch of the night',
    raga: 'Ragini Kanada', img: 'assets/img/6-kanada.jpg',
    alt: 'Ragini Kanada: a blue-skinned figure with sword and shield, an elephant waiting in the courtyard below.',
    line: 'The city goes quiet. Kanada belongs to the late night.',
    bg: '#182a54', ink: '#e8eefa', accent: '#f2c22e', onAccent: '#1c1503', dark: true,
  },
  {
    id: 'triyama', name: 'Triyama', from: 0, to: 3, ordinal: 'the third watch of the night',
    raga: 'Raga Malkauns', img: 'assets/img/7-malkauns.jpg',
    alt: 'Raga Malkaushika: a lord enthroned among attendants with fly-whisks, a musician playing below.',
    line: 'The deepest watch. Malkauns is kept for after midnight.',
    bg: '#0c0e13', ink: '#ede8de', accent: '#e2512a', onAccent: '#160501', dark: true,
  },
  {
    id: 'usha', name: 'Usha', from: 3, to: 6, ordinal: 'the fourth watch of the night',
    raga: 'Ragini Lalit', img: 'assets/img/8-lalit.jpg',
    alt: 'Lalita Ragini: a nobleman leaves at dawn while his lover sleeps; a groom waits with his horse.',
    line: 'The hour before dawn. In Lalit he leaves while she is still asleep.',
    bg: '#2f5059', ink: '#eaf3ef', accent: '#f2b9a8', onAccent: '#2a0d08', dark: true,
  },
];

export function praharIndexAt(date = new Date()) {
  const h = date.getHours();
  return Math.floor((((h - 6) % 24) + 24) % 24 / 3);
}

// Dial colours offered. Names follow the prahars they are taken from.
export const EDITIONS = [
  { id: 'nishitha', name: 'Nishitha', note: 'night blue', dial: '#14306b', second: '#e2512a' },
  { id: 'sayamkala', name: 'Sayamkala', note: 'vermilion', dial: '#c9401c', second: '#f3ead8' },
  { id: 'usha', name: 'Usha', note: 'slate green', dial: '#2c4a4e', second: '#f2b9a8' },
];
