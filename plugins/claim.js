import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

function loadEconomy() {
    try {
        if (fs.existsSync(ECONOMY_FILE)) {
            return JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error('Error cargando economía:', error);
        return {};
    }
}

function saveEconomy(economy) {
    try {
        fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando economía:', error);
        return false;
    }
}

function initUserEconomy(economy, userNumber, pushName) {
    if (!economy[userNumber]) {
        economy[userNumber] = {
            number: userNumber,
            name: pushName || 'Usuario',
            coins: 0,
            minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0 },
            health: 100,
            lastMine: 0, lastWork: 0, lastCrime: 0, lastAdventure: 0, lastClaim: 0, lastChest: 0,
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
    }
    return economy[userNumber];
}

function getNextOsloReset() {
    const now = new Date();
    const osloTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
    const todayReset = new Date(osloTime);
    todayReset.setHours(12, 0, 0, 0);
    if (osloTime > todayReset) {
        todayReset.setDate(todayReset.getDate() + 1);
    }
    return todayReset.getTime();
}

function formatRemainingTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0? `${hours}h ${minutes}m` : `${minutes}m`;
}

export default {
    name: 'claim',
    alias: ['daily', 'recompensa'],

    async execute(sock, msg, options) {
        try {
            // 1. SACAR EL NÚMERO BIEN
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            const senderJid = isGroup? msg.key.participant : msg.key.remoteJid;
            const senderNumber = senderJid.split('@')[0];
            const pushName = msg.pushName || 'Usuario';

            if (!senderNumber) {
                return await sock.sendMessage(from, { text: '❌ No se pudo identificar tu número' }, { quoted: msg });
            }

            let economy = loadEconomy();
            const user = initUserEconomy(economy, senderNumber, pushName);

            const now = Date.now();
            const nextReset = getNextOsloReset();

            // 2. ARREGLO DEL COOLDOWN: 24h en vez de reset fijo
            const cooldown = 24 * 60 * 60 * 1000; // 24 horas
            if (user.lastClaim && (now - user.lastClaim) < cooldown) {
                const timeLeft = cooldown - (now - user.lastClaim);
                const formattedTime = formatRemainingTime(timeLeft);

                return await sock.sendMessage(from, {
                    text: `⏳ *Ya reclamaste tu recompensa diaria*\n\n> Próxima recompensa: *${formattedTime}*`
                }, { quoted: msg });
            }

            // Generar recompensa diaria
            const coinsBase = 200;
            const randomBonus = Math.floor(Math.random() * 150);
            const totalCoins = coinsBase + randomBonus;

            user.coins += totalCoins;
            user.minerals.diamantes += 5;
            user.minerals.esmeraldas += 8;
            user.minerals.oro += 10;
            user.items.agua += 2;
            user.items.vendas += 1;
            user.lastClaim = now;

            saveEconomy(economy);

            const osloTime = new Date().toLocaleString('es-ES', {
                timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit'
            });

            const claimText = `🎑 *RECOMPENSA DIARIA*\n\n` +
                `📍 ${osloTime} Oslo\n\n` +
                `💰 Coins » *+${totalCoins}* (${coinsBase} base + ${randomBonus} bonus)\n` +
                `💎 Diamantes » *+5*\n` +
                `💚 Esmeraldas » *+8*\n` +
                `🪙 Oro » *+10*\n` +
                `🍶 Agua » *+2*\n` +
                `🩹 Vendas » *+1*\n\n` +
                `> Vuelve en 24h`;

            await sock.sendMessage(from, { text: claimText }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en comando claim:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};