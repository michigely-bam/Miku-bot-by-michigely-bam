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
    name: 'setedad',
    alias: ['se'],
 category: 'economy',

    async execute(sock, msg, { senderNumber, pushName, args, replyWithContext, senderJid }) {
        const db = load();
        if (!db[senderNumber]) db[senderNumber] = createUser(senderNumber, pushName);
        const u = db[senderNumber];

        const edad = parseInt(args[0]);
        if (!edad || edad < 1 || edad > 99)
            return replyWithContext(`❌ Usa:.setedad 1-99`, [senderJid]);

        u.edad = edad;
        save(db);

        replyWithContext(`📂 Edad actualizada a: *${edad} años*`, [senderJid]);
    }
};