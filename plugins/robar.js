import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '../../databases/economy.json');

// ====== UTILS ======
const loadEconomy = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE)) : {};
const saveEconomy = (d) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(d, null, 2));
const money = (n) => Number(n || 0).toLocaleString('es-AR');

const createUser = (num, name) => ({
    number: num, name: name||'Usuario', coins: 0, bank: 0,
    lastWork: 0, lastMine: 0, lastHustle: 0, lastCrime: 0
});

const DELITOS = [ // Cosas ficticias del bot, sin detalles reales
    'hackeaste un casino del bot',
    'vendiste items glitcheados',
    'hiciste un scam de lotería falsa',
    'explotaste un bug del economy'
];

export default {
    name: 'crime',
    alias: ['delito', 'ilegal'],
    cooldown: 20, // 20 min, paga más que hustle

    async execute(sock, msg, { senderNumber, pushName, replyWithContext, senderJid }) {
        const db = loadEconomy();
        if (!db[senderNumber]) db[senderNumber] = createUser(senderNumber, pushName);
        const user = db[senderNumber];

        // Cooldown 20min
        if (Date.now() - user.lastCrime < 20 * 60 * 1000) {
            const min = Math.ceil((20 * 60 * 1000 - (Date.now() - user.lastCrime)) / 60000);
            return replyWithContext(`🚔 La policía te está vigilando.\nVolvé en *${min} min*`, [senderJid]);
        }

        const delito = DELITOS[Math.floor(Math.random() * DELITOS.length)];
        const roll = Math.random();
        let text = `╭─「 🚨 CRIME 」─╮\n│${delito}\n├────────────────\n`;

        if (roll > 0.4) { // 60% sale bien
            const earn = Math.floor(Math.random() * 1500) + 800; // 800-2300
            user.coins += earn;
            text += `│✅ Zafaste de la policía\n`;
            text += `│💰 Ganaste: ${money(earn)} Coins\n`;
        } else { // 40% te atrapan
            const fine = Math.floor(Math.random() * 600) + 300; // 300-900
            user.coins = Math.max(0, user.coins - fine);
            text += `│❌ Te atrapó la policía\n`;
            text += `│💸 Multa: ${money(fine)} Coins\n`;
        }

        user.lastCrime = Date.now();
        saveEconomy(db);
        text += `│👛 Billetera: ${money(user.coins)}\n`;
        text += `╰────────────────╯`;

        return replyWithContext(text, [senderJid]);
    }
};