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
            lastMine: 0, lastWork: 0, lastCrime: 0, lastAdventure: 0,
            lastClaim: 0, lastChest: 0, lastHunt: 0, lastFish: 0,
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
    }
    return economy[userNumber];
}

function getRemainingTime(lastUsed, cooldownMs = 180000) {
    const now = Date.now();
    const timePassed = now - lastUsed;
    if (timePassed >= cooldownMs) return 0;
    const remaining = cooldownMs - timePassed;
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
    return `${remainingSeconds}s`;
}

const animals = [
    { name: "🐇 Conejo", rarity: "común", coins: [15, 25], healthCost: [2, 5] },
    { name: "🦊 Zorro", rarity: "común", coins: [20, 35], healthCost: [3, 6] },
    { name: "🦌 Venado", rarity: "común", coins: [25, 40], healthCost: [4, 7] },
    { name: "🐗 Jabalí", rarity: "raro", coins: [40, 70], healthCost: [8, 15] },
    { name: "🐺 Lobo", rarity: "raro", coins: [50, 85], healthCost: [10, 18] },
    { name: "🐆 Jaguar", rarity: "raro", coins: [60, 100], healthCost: [12, 20] },
    { name: "🐻 Oso", rarity: "épico", coins: [100, 180], healthCost: [15, 25] },
    { name: "🦅 Águila Real", rarity: "épico", coins: [120, 200], healthCost: [10, 20] },
    { name: "🐉 Dragón", rarity: "legendario", coins: [300, 600], healthCost: [25, 40], special: true },
    { name: "🦄 Unicornio", rarity: "legendario", coins: [250, 500], healthCost: [15, 25], special: true }
];

export default {
    name: 'cazar',
    alias: ['hunt', 'caza'],
    category: 'Economy',
    description: 'Ve de caza y gana coins. CD: 3min',

    async execute(sock, msg, options) {
        try {
            const { senderNumber, senderJid, pushName, replyWithContext } = options;
            const number = senderNumber || senderJid.split('@')[0]

            if (!number) {
                return await replyWithContext('❌ No se pudo identificar tu número', [senderJid]);
            }

            let economy = loadEconomy(); // <- AHORA SI EXISTE
            const user = initUserEconomy(economy, number, pushName);

            if (user.health < 15) {
                return await replyWithContext('⚠️ *Estás muy débil para cazar*\n> Necesitas al menos 15 de salud\n> Usa *heal* para recuperarte', [senderJid]);
            }

            const cooldownTime = 180000;
            const now = Date.now();

            if (user.lastHunt && (now - user.lastHunt) < cooldownTime) {
                const remaining = getRemainingTime(user.lastHunt, cooldownTime);
                return await replyWithContext(`⏳ *Debes esperar ${remaining}* para volver a cazar`, [senderJid]);
            }

            user.lastHunt = now;
            const rand = Math.random();
            let animal;

            if (rand < 0.6) animal = animals.filter(a => a.rarity === 'común')[Math.floor(Math.random() * 3)];
            else if (rand < 0.9) animal = animals.filter(a => a.rarity === 'raro')[Math.floor(Math.random() * 3)];
            else if (rand < 0.98) animal = animals.filter(a => a.rarity === 'épico')[Math.floor(Math.random() * 2)];
            else animal = animals.filter(a => a.rarity === 'legendario')[Math.floor(Math.random() * 2)];

            const coinsGanados = Math.floor(Math.random() * (animal.coins[1] - animal.coins[0] + 1)) + animal.coins[0];
            const saludPerdida = Math.floor(Math.random() * (animal.healthCost[1] - animal.healthCost[0] + 1)) + animal.healthCost[0];

            user.coins += coinsGanados;
            user.health = Math.max(0, user.health - saludPerdida);

            let specialText = '';
            if (animal.special) {
                if (animal.name === "🐉 Dragón") { user.coins += 100; specialText = '\n🐉 *¡Escamas de dragón!* +100 coins extra'; }
                else if (animal.name === "🦄 Unicornio") { user.coins += 50; user.health = Math.min(100, user.health + 20); specialText = '\n🦄 *¡Cuerno mágico!* +50 coins y +20 salud'; }
            }

            saveEconomy(economy); // <- AHORA SI EXISTE

            let rarityEmoji = { 'común': '🟢', 'raro': '🔵', 'épico': '🟣', 'legendario': '🟡' }[animal.rarity];

            const huntText = `🏹 *CAZA EXITOSA*\n\n${animal.name}\n${rarityEmoji} *Rareza:* ${animal.rarity.toUpperCase()}\n\n🎑 *RECOMPENSAS*\n\n💰 Coins obtenidos » *+${coinsGanados}*\n❤️ Salud perdida » *-${saludPerdida}*${specialText}\n\n📊 *Total:* ${user.coins} coins | ${user.health} salud`;

            await replyWithContext(huntText, [senderJid]);

        } catch (error) {
            console.error('❌ Error en comando cazar:', error);
            await options.replyWithContext(`❌ Error: ${error.message}`, [options.senderJid]);
        }
    }
};