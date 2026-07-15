import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const load = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8')) : {};
const save = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));

const fmt = (n) => Number(n || 0).toLocaleString('es-MX');

export default {
    name: 'bank',
    alias: ['inventario', 'balance', 'bal'],
    category: 'Economy',
    description: 'Ver tu inventario',

    async execute(sock, msg, { senderJid, pushName }) {
        try {
            const number = senderJid.split('@')[0];
            const from = msg.key.remoteJid;
            let db = load();

            // CREAR USUARIO SI NO EXISTE
            if (!db[number]) {
                db[number] = {
                    name: pushName,
                    coins: 0,
                    bank: 0,
                    minerals: { oro: 0, diamantes: 0, esmeraldas: 0, piedras: 0 },
                    health: 100,
                    mana: 50,
                    items: { agua: 0, vendas: 0, pico: 1 },
                    lastWork: 0, lastCrime: 0, lastHunt: 0, lastMine: 0
                };
                save(db);
            }

            const u = db[number];

            // FIX: FORZAR VALORES SI SON NULL/UNDEFINED
            if (u.bank === undefined || u.bank === null) u.bank = 0;
            if (u.coins === undefined || u.coins === null) u.coins = 0;
            if (u.health === undefined || u.health === null) u.health = 100;
            if (u.mana === undefined || u.mana === null) u.mana = 50;
            if (!u.minerals) u.minerals = { oro: 0, diamantes: 0, esmeraldas: 0, piedras: 0 };
            if (!u.items) u.items = { agua: 0, vendas: 0, pico: 1 };

            save(db); // guardar los fixes

            let txt = `*┌─『 INVENTARIO 』─*\n`;
            txt += `*│* 👤 ${pushName}\n`;
            txt += `*│* 💰 Coins: ${fmt(u.coins)}\n`;
            txt += `*│* 🏦 Banco: ${fmt(u.bank)}\n`;
            txt += `*│* 📊 Total: ${fmt(u.coins + u.bank)}\n`;
            txt += `*│*\n`;
            txt += `*│* ❤️ Salud: ${u.health}%\n`;
            txt += `*│* 🔮 Mana: ${u.mana}%\n`;
            txt += `*│*\n`;
            txt += `*│* 🪙 Oro: ${fmt(u.minerals.oro)}\n`;
            txt += `*│* 💎 Diamante: ${fmt(u.minerals.diamantes)}\n`;
            txt += `*│* 💚 Esmeralda: ${fmt(u.minerals.esmeraldas)}\n`;
            txt += `*│* 🪨 Piedra: ${fmt(u.minerals.piedras)}\n`;
            txt += `*└─────────────────*`;

            await sock.sendMessage(from, { text: txt }, { quoted: msg });

        } catch (e) {
            console.error(e);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};