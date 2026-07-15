import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ECONOMY_FILE = path.join(__dirname, '..', 'databases', 'economy.json');

const loadEconomy = () => fs.existsSync(ECONOMY_FILE)? JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf8')) : {};
const saveEconomy = (economy) => fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2));

function getRemainingTime(lastUsed, cooldownMs = 120000) {
    const now = Date.now();
    const timePassed = now - lastUsed;
    if (timePassed >= cooldownMs) return 0;
    const remaining = cooldownMs - timePassed;
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export default {
    name: 'minar',
    alias: ['mine', 'mineria'],
    category: 'Economy',
    description: 'Ir a minar recursos',

    async execute(sock, msg, { senderJid, pushName, replyWithContext }) {
        try {
            const number = senderJid.split('@')[0];
            let economy = loadEconomy();

            if (!economy[number]) {
                economy[number] = {
                    name: pushName, coins: 0, bank: 0, mana: 50, health: 100,
                    lastMine: 0, lastWork: 0, lastCrime: 0,
                    minerals: { piedras: 0, diamantes: 0, esmeraldas: 0, oro: 0, rubies: 0, zafiros: 0 },
                    items: { agua: 0, vendas: 0, pico: 1 }
                };
                saveEconomy(economy);
            }

            const user = economy[number];
            if (user.health <= 10) {
                return await replyWithContext('⚠️ *Tu salud es muy baja para seguir minando* ⚠️\n> Usa *heal* para recuperarte', [senderJid]);
            }

            const now = Date.now();
            if (user.lastMine && (now - user.lastMine) < 120000) {
                const remaining = getRemainingTime(user.lastMine, 120000);
                return await replyWithContext(`⏳ *Debes esperar ${remaining}* para volver a minar`, [senderJid]);
            }

            user.lastMine = now;

            const piedra = Math.floor(Math.random() * 50) + 20;
            const diamante = Math.floor(Math.random() * 5) + 1;
            const esmeralda = Math.floor(Math.random() * 8) + 2;
            const oro = Math.floor(Math.random() * 10) + 3;
            const healthLoss = Math.floor(Math.random() * 11) + 5;

            user.minerals.piedras += piedra;
            user.minerals.diamantes += diamante;
            user.minerals.esmeraldas += esmeralda;
            user.minerals.oro += oro;
            user.health = Math.max(0, user.health - healthLoss);

            saveEconomy(economy);

            const txt = `⛏️ *VIAJE A LA MINA*\n🧭 Trabajaste duro buscando recursos\n*✨ RECOMPENSAS*\n🪨 Piedras » *+${piedra}*\n💎 Diamantes » *+${diamante}*\n💚 Esmeraldas » *+${esmeralda}*\n🪙 Oro » *+${oro}*\n\n❤️ Salud perdida » *-${healthLoss}*`;

            await replyWithContext(txt, [senderJid]);

        } catch (error) {
            console.error('❌ Error en minar:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};