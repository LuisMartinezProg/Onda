/* Deteccion de genero para el ecualizador automatico */
const MOODG={rock:'Rock',electrónica:'Electrónica',electronica:'Electrónica',acústico:'Acústico',acustico:'Acústico',pop:'Voz',jazz:'Acústico',clásica:'Acústico',classica:'Acústico'};
function guessPre(t){if(!t)return'Plano';const s=((t.al||'')+' '+(t.a||'')).toLowerCase();for(const k in MOODG)if(s.includes(k))return MOODG[k];return'Plano'}
