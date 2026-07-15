import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AHORCADO_FILE = path.join(__dirname, '../databases/ahorcado.json');

const load = () => fs.existsSync(AHORCADO_FILE)? JSON.parse(fs.readFileSync(AHORCADO_FILE)) : {};
const save = (d) => {
    fs.mkdirSync(path.dirname(AHORCADO_FILE), { recursive: true });
    fs.writeFileSync(AHORCADO_FILE, JSON.stringify(d, null, 2));
};

const palabras = ['GALAXIT', 'BOT', 'MARDEL', 'ECONOMY', 'CRIME', 'WORK', 'ARG', 'WSP'];
const MAX_VIDAS = 6;

const dibujar = (v) => {
    const d = ['┌───┐\n│ │\n│\n│\n│\n│\n└───', '┌───┐\n│ │\n│ O\n│\n│\n│\n└───', '┌───┐\n│ │\n│ O\n│ │\n│\n│\n└───', '┌───┐\n│ │\n│ O\n│ /│\n│\n│\n└───', '┌───┐\n│ │\n│ O\n│ /│\\\n│\n│\n└───', '┌───┐\n│ │\n│ O\n│ /│\\\n│ /\n│\n└───', '┌───┐\n│ │\n│ O\n│ /│\\\n│ / \\\n│\n└───'];
    return d[MAX_VIDAS - v];
};

export default {
    name: 'ahorcado',
    alias: ['ah'],
    description: 'Ahorcado. Usa:.ah start /.ah A',
    category: 'DIVERCION',

    async execute(sock, msg, { args, replyWithContext, senderJid }) {
        const db = load();
        const chat = msg.key.remoteJid;
        if (!db[chat]) db[chat] = null;
        let juego = db[chat];

        const sub = args[0]?.toLowerCase();

        if (sub === 'start' ||!juego) {
            const palabra = palabras[Math.floor(Math.random() * palabras.length)];
            db[chat] = {
                palabra,
                oculta: '_ '.repeat(palabra.length).trim(),
                letras: [],
                vidas: MAX_VIDAS
            };
            save(db);
            return replyWithContext(`🎮 *AHORCADO*\n\nPalabra: \`${db[chat].oculta}\`\nVidas: ${'❤️'.repeat(MAX_VIDAS)}\n\n${dibujar(MAX_VIDAS)}\n\n.ah A`);
        }

        const letra = sub?.toUpperCase();
        if (!letra || letra.length!== 1) return replyWithContext(`❌.ah A`, [senderJid]);
        if (juego.letras.includes(letra)) return replyWithContext(`⚠️ Ya usaste ${letra}`, [senderJid]);

        juego.letras.push(letra);
        let acerto = false;
        let nueva = '';
        for (let i = 0; i < juego.palabra.length; i++) {
            if (juego.palabra[i] === letra) { nueva += letra + ' '; acerto = true; }
            else { nueva += juego.oculta[i*2] + ' '; }
        }
        juego.oculta = nueva.trim();
        if (!acerto) juego.vidas--;

        if (!juego.oculta.includes('_')) {
            delete db[chat];
            save(db);
            return replyWithContext(`🎉 Ganaste! Era: *${juego.palabra}*\n.ah start`);
        }
        if (juego.vidas <= 0) {
            delete db[chat];
            save(db);
            return replyWithContext(`💀 Perdiste! Era: *${juego.palabra}*\n${dibujar(0)}\n.ah start`);
        }

        save(db);
        replyWithContext(`Palabra: \`${juego.oculta}\`\nLetras: ${juego.letras.join(', ')}\nVidas: ${'❤️'.repeat(juego.vidas)}\n\n${dibujar(juego.vidas)}`);
    }
};