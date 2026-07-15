import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cleanNumber = (num) => num ? num.toString().replace(/[^0-9]/g, '') : '';
const PRIMARIOS_FILE = path.join(__dirname, '..', 'databases', 'primarios.json');

const databasesDir = path.join(__dirname, '..', 'databases');
if (!fs.existsSync(databasesDir)) fs.mkdirSync(databasesDir, { recursive: true });

function getBotName(botNumber) {
    try {
        const botNumberClean = cleanNumber(botNumber);
        
        // Buscar en subs (main, premium, sub)
        const subDir = path.join(process.cwd(), 'subs', botNumberClean);
        const subConfigPath = path.join(subDir, 'config.js');
        if (fs.existsSync(subConfigPath)) {
            const content = fs.readFileSync(subConfigPath, 'utf8');
            const match = content.match(/nombre:\s*['"]([^'"]+)['"]/);
            if (match && match[1]) return match[1];
        }
        
        // Buscar en info (bots principales)
        const infoDir = path.join(process.cwd(), 'info', botNumberClean);
        const configPath = path.join(infoDir, 'config.js');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const match = content.match(/nombre:\s*['"]([^'"]+)['"]/);
            if (match && match[1]) return match[1];
        }
        
        return 'Bot';
    } catch (error) {
        return 'Bot';
    }
}

function getPrimaryBot(groupId) {
    try {
        if (fs.existsSync(PRIMARIOS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8'));
            return data[groupId] || null;
        }
    } catch (e) {}
    return null;
}

function savePrimaryBot(groupId, botNumber, botName) {
    try {
        let data = {};
        if (fs.existsSync(PRIMARIOS_FILE)) {
            data = JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8'));
        }
        data[groupId] = {
            botNumber: botNumber,
            botName: botName,
            updated: Date.now()
        };
        fs.writeFileSync(PRIMARIOS_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Error guardando bot primario:', e);
        return false;
    }
}

function deletePrimaryBot(groupId) {
    try {
        if (fs.existsSync(PRIMARIOS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PRIMARIOS_FILE, 'utf8'));
            delete data[groupId];
            fs.writeFileSync(PRIMARIOS_FILE, JSON.stringify(data, null, 2));
            return true;
        }
    } catch (e) {}
    return false;
}

function getActiveBotsFromGlobals() {
    const activeBots = [];
    const seenNumbers = new Set();
    
    try {
        const addBot = (bot, type) => {
            if (!bot?.user?.id) return;
            const number = cleanNumber(bot.user.id);
            if (!number || seenNumbers.has(number)) return;
            seenNumbers.add(number);
            activeBots.push({
                number: number,
                name: getBotName(number),
                type: type,
                sock: bot
            });
        };
        
        // Agregar bot principal
        if (global.principalBot) {
            addBot(global.principalBot, 'Principal');
        }
        
        // Agregar premium bots
        if (global.premiumBots && Array.isArray(global.premiumBots)) {
            for (const bot of global.premiumBots) {
                addBot(bot, 'Premium');
            }
        }
        
        // Agregar main bots
        if (global.mainBots && Array.isArray(global.mainBots)) {
            for (const bot of global.mainBots) {
                addBot(bot, 'Main');
            }
        }
        
        // Agregar sub bots
        if (global.conns && Array.isArray(global.conns)) {
            for (const bot of global.conns) {
                addBot(bot, 'Sub');
            }
        }
    } catch (e) {
        console.error('Error obteniendo bots activos:', e);
    }
    
    return activeBots;
}

export default {
    name: 'setprimary',
    alias: ['primary', 'botprimario'],
    description: 'Establece un bot primario en el grupo (solo administradores)',
    category: 'group',
    
    async execute(sock, msg, options) {
        try {
            const { config, replyWithContext, isGroup, senderJid, pushName, userNumber, args, isSubBot } = options;
            const from = msg.key.remoteJid;
            
            if (!isGroup) {
                return await replyWithContext(`「✰」 Este comando solo funciona en grupos`);
            }
            
            let groupMetadata;
            try {
                groupMetadata = await sock.groupMetadata(from);
            } catch (error) {
                return await replyWithContext(`❌ Error al obtener información del grupo`);
            }
            
            const senderParticipant = groupMetadata.participants.find(p => p.id === senderJid);
            const isSenderAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';
            const isOwner = config.owner?.some(owner => cleanNumber(owner) === cleanNumber(userNumber));
            
            if (!isSenderAdmin && !isOwner) {
                return await replyWithContext(`「✰」 Debes ser administrador del grupo para usar este comando`);
            }
            
            let currentBotNumber = '';
            if (sock.phoneNumber) {
                currentBotNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
            } else if (sock.user?.id) {
                currentBotNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
            }
            
            // Obtener todos los bots activos desde globales
            const activeBots = getActiveBotsFromGlobals();
            
            // Identificar bots en el grupo (misma lógica que el comando bots)
            const botsInGroup = [];
            for (const participant of groupMetadata.participants) {
                const participantNumber = cleanNumber(participant.id);
                
                // Verificar si es un bot activo
                const botInfo = activeBots.find(b => b.number === participantNumber);
                
                if (botInfo) {
                    botsInGroup.push({
                        number: participantNumber,
                        jid: participant.id,
                        name: botInfo.name,
                        type: botInfo.type,
                        isCurrent: participantNumber === currentBotNumber
                    });
                }
            }
            
            // Si no hay bots en el grupo, intentar con la lógica del comando bots
            if (botsInGroup.length === 0) {
                // Buscar en subs (main, premium, sub)
                const subsDir = path.join(process.cwd(), 'subs');
                if (fs.existsSync(subsDir)) {
                    const folders = fs.readdirSync(subsDir).filter(folder => {
                        const folderPath = path.join(subsDir, folder);
                        return fs.statSync(folderPath).isDirectory() && /^\d+$/.test(folder);
                    });
                    
                    for (const folder of folders) {
                        const botNumber = folder;
                        // Verificar si está en el grupo
                        const inGroup = groupMetadata.participants.some(p => cleanNumber(p.id) === botNumber);
                        if (inGroup) {
                            const botName = getBotName(botNumber);
                            // Verificar tipo de bot desde el config
                            let type = 'Sub';
                            try {
                                const configPath = path.join(subsDir, botNumber, 'config.js');
                                if (fs.existsSync(configPath)) {
                                    const content = fs.readFileSync(configPath, 'utf8');
                                    if (content.includes('mainBot: true')) type = 'Main';
                                    else if (content.includes('premBot: true')) type = 'Premium';
                                    else if (content.includes('subBot: true')) type = 'Sub';
                                }
                            } catch (e) {}
                            
                            botsInGroup.push({
                                number: botNumber,
                                jid: `${botNumber}@s.whatsapp.net`,
                                name: botName,
                                type: type,
                                isCurrent: botNumber === currentBotNumber
                            });
                        }
                    }
                }
            }
            
            if (botsInGroup.length === 0) {
                return await replyWithContext(`「✰」 No hay bots disponibles en este grupo`);
            }
            
            const argsLower = args[0]?.toLowerCase();
            if (argsLower === 'off' || argsLower === 'remove' || argsLower === 'eliminar') {
                const currentPrimary = getPrimaryBot(from);
                if (!currentPrimary) {
                    return await replyWithContext(`「✰」 No hay un bot primario configurado en este grupo`);
                }
                
                deletePrimaryBot(from);
                return await replyWithContext(`《✧》 Bot primario eliminado\n> Ahora todos los bots pueden responder en el grupo`);
            }
            
            let targetJid = null;
            let targetNumber = null;
            
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentionedJid && mentionedJid.length > 0) {
                targetJid = mentionedJid[0];
                targetNumber = cleanNumber(targetJid);
            }
            
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            if (!targetJid && quotedMsg?.participant) {
                targetJid = quotedMsg.participant;
                targetNumber = cleanNumber(targetJid);
            }
            
            if (!targetJid && args && args.length > 0) {
                const searchNumber = cleanNumber(args[0]);
                const foundBot = botsInGroup.find(b => b.number === searchNumber);
                if (foundBot) {
                    targetNumber = foundBot.number;
                    targetJid = foundBot.jid;
                }
            }
            
            if (targetJid && targetNumber) {
                const targetBot = botsInGroup.find(b => b.number === targetNumber);
                
                if (!targetBot) {
                    return await replyWithContext(`「✰」 El bot ${targetNumber} no está en este grupo`);
                }
                
                savePrimaryBot(from, targetBot.number, targetBot.name);
                
                await replyWithContext(`《✧》 @${targetBot.number} ha sido establecido como bot primario\n> Solo este bot responderá en el grupo\n> Tipo: ${targetBot.type}`, 
                    [`${targetBot.number}@s.whatsapp.net`]);
                
                console.log(`✅ Bot primario ${targetBot.number} establecido en grupo ${cleanNumber(from)} por ${pushName || userNumber}`);
                return;
            }
            
            // Mostrar lista de bots disponibles
            const rows = botsInGroup.map(bot => ({
                title: `${bot.name} | ${bot.number}`,
                description: bot.isCurrent ? `✅ Bot actual (${bot.type})` : `🔄 Establecer como primario (${bot.type})`,
                id: `${config.prefix}setprimary ${bot.number}`
            }));
            
            const sections = [{
                title: "🤖 BOTS EN ESTE GRUPO",
                rows: rows
            }];
            
            await sock.sendMessage(from, {
                text: "🏮 *Selecciona el bot primario*\n\nElige qué bot será el único que responderá en este grupo.\n\n*Para eliminar el bot primario usa:*\n> `setprimary off`",
                footer: config.nombre || config.name,
                interactiveButtons: [
                    {
                        name: "single_select",
                        buttonParamsJson: JSON.stringify({
                            title: "🤖 Ver bots disponibles",
                            sections: sections
                        })
                    }
                ]
            }, { quoted: msg });
            
        } catch (error) {
            console.error('❌ Error en setprimary:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};