import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const load = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8')) : {};
const save = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));

export default {
    name: 'robo', // <- NOMBRE NUEVO
    alias: ['crime', 'crimen', 'robar'],
    category: 'Economy',
    description: 'Robar para ganar coins',

    async execute(sock, msg, { senderJid, pushName, replyWithContext }) {
        const number = senderJid.split('@')[0];
        let db = load();

        if (!db[number]) {
            db[number] = { name: pushName, coins: 0, bank: 0, mana: 50, health: 100, lastCrime: 0, minerals: {}, items: {} };
            save(db);
        }

        const u = db[number];
        const now = Date.now();

        if (u.lastCrime && (now - u.lastCrime) < 120000) {
            const seg = Math.ceil((120000 - (now - u.lastCrime)) / 1000);
            return await replyWithContext(`⏳ Espera ${seg}s para robar de nuevo`, [senderJid]);
        }

        u.lastCrime = now;
        const exito = Math.random() < 0.7;

        if (exito) {
            const ganancia = Math.floor(Math.random() * 150) + 100;
            u.coins += ganancia;
            u.health -= 15;
            save(db);
            return await replyWithContext(`🔫 *ROBO EXITOSO*\n+${ganancia} coins\n-15 salud`, [senderJid]);
        } else {
            const perdida = Math.min(50, u.coins);
            u.coins -= perdida;
            u.health -= 25;
            save(db);
            return await replyWithContext(`🚔 *TE ATRAPARON*\n-${perdida} coins\n-25 salud`, [senderJid]);
        }
    }
};