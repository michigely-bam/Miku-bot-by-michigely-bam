import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const loadEconomy = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8')) : {};

function initUserEconomy(economy, userNumber, pushName) {
    if (!economy[userNumber]) {
        economy[userNumber] = {
            number: userNumber,
            name: pushName || 'Usuario',
            coins: 0,
            bank: 0,
            mana: 50,
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 },
            health: 100,
            lastMine: 0, lastWork: 0, lastCrime: 0, lastAdventure: 0, lastClaim: 0, lastChest: 0,
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
    }
    return economy[userNumber];
}

function getCooldown(lastUsed, cooldownMs) {
    if (!lastUsed) return '✅ Listo';
    const now = Date.now();
    const timePassed = now - lastUsed;
    if (timePassed >= cooldownMs) return '✅ Listo';

    const remaining = cooldownMs - timePassed;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (hours > 0) return `⏳ ${hours}h ${minutes}m`;
    if (minutes > 0) return `⏳ ${minutes}m ${seconds}s`;
    return `⏳ ${seconds}s`;
}

export default {
    name: 'einfo',
    alias: ['cooldowns', 'cd', 'economia', 'info'],
    category: 'Economy',
    description: 'Muestra tu información y cooldowns',

    async execute(sock, msg, { pushName }) {
        try {
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const senderJid = isGroup? msg.key.participant : msg.key.remoteJid;
            const senderNumber = senderJid.split('@')[0];

            let economy = loadEconomy();
            const user = initUserEconomy(economy, senderNumber, pushName);

            // Cooldowns en ms
            const cd = {
                work: 2 * 60 * 1000, // 2 min
                mine: 5 * 60 * 1000, // 5 min
                crime: 10 * 60 * 1000, // 10 min
                adventure: 30 * 60 * 1000,// 30 min
                daily: 24 * 60 * 60 * 1000,// 24h
                chest: 12 * 60 * 60 * 1000 // 12h
            };

            const infoText = `📊 *INFO DE ${user.name.toUpperCase()}*\n\n` +
                `💰 *Billetera*: ${user.coins.toLocaleString()}\n` +
                `🏦 *Banco*: ${user.bank.toLocaleString()}\n` +
                `❤️ *Salud*: ${user.health}/100\n` +
                `🔮 *Mana*: ${user.mana}/100\n\n` +

                `📦 *MINERALES*\n` +
                `🪨 Piedras: ${user.minerals.piedras}\n` +
                `💎 Diamantes: ${user.minerals.diamantes}\n` +
                `💚 Esmeraldas: ${user.minerals.esmeraldas}\n` +
                `🪙 Oro: ${user.minerals.oro}\n\n` +

                `🎒 *ITEMS*\n` +
                `🍶 Agua: ${user.items.agua}\n` +
                `🩹 Vendas: ${user.items.vendas}\n` +
                `💊 Pastillas: ${user.items.pastillas}\n\n` +

                `⏰ *COOLDOWNS*\n` +
                `💼 Trabajo: ${getCooldown(user.lastWork, cd.work)}\n` +
                `⛏️ Minar: ${getCooldown(user.lastMine, cd.mine)}\n` +
                `💀 Crimen: ${getCooldown(user.lastCrime, cd.crime)}\n` +
                `🗺️ Aventura: ${getCooldown(user.lastAdventure, cd.adventure)}\n` +
              `✨ slut: ${getCooldown(user.lastClaim, cd.daily)}\n` +
                `🎁 Daily: ${getCooldown(user.lastClaim, cd.daily)}\n` +
                `📦 Cofre: ${getCooldown(user.lastChest, cd.chest)}`;

            await sock.sendMessage(from, { text: infoText }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en comando einfo:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};