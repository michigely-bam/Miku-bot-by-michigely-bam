import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '../databases/economy.json');

const load = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE)) : {};
const save = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));

const createUser = (num, name) => ({
    number: num, name: name||'Usuario', coins: 0, bank: 0,
    genero: 'No definido', edad: 0, casado: null, vip: false,
    lastWork: 0, lastMine: 0, lastHustle: 0, lastCrime: 0, lastRob: 0, lastDaily: 0
});

export default {
    name: 'setgenero',
    alias: ['sg'],
    category: 'economy', 
    description: 'Establece tu género. Uso:.setgenero Hombre/Mujer',

    async execute(sock, msg, { senderNumber, pushName, args, replyWithContext, senderJid }) {
        const db = load();
        if (!db[senderNumber]) db[senderNumber] = createUser(senderNumber, pushName);
        const u = db[senderNumber];

        const genero = args.join(' ');
        if (!genero) return replyWithContext(`❌ Usa:.setgenero Hombre / Mujer / No binario`, [senderJid]);

        u.genero = genero.slice(0, 20); // Max 20 chars para que no rompa el cuadro
        save(db);

        replyWithContext(`🌃 Género actualizado a: *${u.genero}*`, [senderJid]);
    }
};