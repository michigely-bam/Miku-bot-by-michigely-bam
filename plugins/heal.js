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
            lastMine: null,
            lastWork: null,
            items: { agua: 0, vendas: 0, pastillas: 0 }
        };
    }
    return economy[userNumber];
}

export default {
    name: 'heal',
    alias: ['curar', 'cure', 'recuperar'],

    async execute(sock, msg, options) {
        try {
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');

            // AQUÍ ESTABA EL ERROR. Ahora sacamos el número directo
            const senderJid = isGroup? msg.key.participant : msg.key.remoteJid;
            const senderNumber = senderJid.split('@')[0];
            const pushName = msg.pushName || 'Usuario';

            if (!senderNumber) {
                return await sock.sendMessage(from, {
                    text: '❌ No se pudo identificar tu número'
                }, { quoted: msg });
            }

            let economy = loadEconomy();
            const user = initUserEconomy(economy, senderNumber, pushName);

            // Verificar si tiene recursos
            if (user.items.agua < 1 && user.items.vendas < 1 && user.items.pastillas < 1) {
                return await sock.sendMessage(from, {
                    text: '⭐ No tienes suficientes recursos para curarte\n> Compra items con *buy*'
                }, { quoted: msg });
            }

            // Si ya tiene salud completa
            if (user.health >= 100) {
                return await sock.sendMessage(from, {
                    text: '❤️ Ya tienes la salud al máximo'
                }, { quoted: msg });
            }

            // Calcular cuánto se puede curar
            const healthNeeded = 100 - user.health;
            let healthHealed = 0;
            let itemsUsed = [];

            // Usar pastillas (curan 30)
            if (user.items.pastillas > 0 && healthHealed < healthNeeded) {
                const pastillasToUse = Math.min(user.items.pastillas, Math.ceil((healthNeeded - healthHealed) / 30));
                if (pastillasToUse > 0) {
                    healthHealed += pastillasToUse * 30;
                    user.items.pastillas -= pastillasToUse;
                    itemsUsed.push(`${pastillasToUse}💊`);
                }
            }

            // Usar vendas (curan 20)
            if (user.items.vendas > 0 && healthHealed < healthNeeded) {
                const vendasToUse = Math.min(user.items.vendas, Math.ceil((healthNeeded - healthHealed) / 20));
                if (vendasToUse > 0) {
                    healthHealed += vendasToUse * 20;
                    user.items.vendas -= vendasToUse;
                    itemsUsed.push(`${vendasToUse}🩹`);
                }
            }

            // Usar agua (cura 10)
            if (user.items.agua > 0 && healthHealed < healthNeeded) {
                const aguaToUse = Math.min(user.items.agua, Math.ceil((healthNeeded - healthHealed) / 10));
                if (aguaToUse > 0) {
                    healthHealed += aguaToUse * 10;
                    user.items.agua -= aguaToUse;
                    itemsUsed.push(`${aguaToUse}🍶`);
                }
            }

            // Aplicar curación
            const finalHealth = Math.min(100, user.health + healthHealed);
            user.health = finalHealth;

            saveEconomy(economy);

            const itemsUsedText = itemsUsed.length > 0? `> Usaste: ${itemsUsed.join(' • ')}` : '';

            await sock.sendMessage(from, {
                text: `💉 *Te has curado*\n> Salud » *${finalHealth}*/100\n${itemsUsedText}`
            }, { quoted: msg });

        } catch (error) {
            console.error('❌ Error en comando heal:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};