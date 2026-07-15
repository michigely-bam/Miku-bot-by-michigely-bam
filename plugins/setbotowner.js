import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanNumber(number) {
    if (!number) return '';
    let cleaned = number.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

function getBotConfigPath(sock) {
    let botNumber = '';
    if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
    } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }
    
    if (!botNumber) return null;
    
    const subBotPath = path.join(process.cwd(), 'subs', botNumber, 'config.js');
    if (fs.existsSync(subBotPath)) {
        return { path: subBotPath, type: 'sub-bot', number: botNumber };
    }
    
    const mainPath = path.join(process.cwd(), 'config.js');
    if (fs.existsSync(mainPath)) {
        return { path: mainPath, type: 'main', number: botNumber };
    }
    
    return null;
}

export default {
    name: 'setbotowner',
    alias: ['botowner'],
    description: 'Transfiere la propiedad del bot a otro usuario (solo dueño actual)',
    category: 'sub-bot',
    
    async execute(sock, msg, options) {
        try {
            const { config, replyWithContext, userNumber, senderNumber } = options;
            
            const senderNumberClean = cleanNumber(senderNumber || userNumber || '');
            const currentBotowner = config.botowner ? cleanNumber(config.botowner) : '';
            
            if (senderNumberClean !== currentBotowner) {
                return await replyWithContext(`🌌 *Solo el dueño actual del bot puede transferir la propiedad*`);
            }
            
            let newOwnerJid = null;
            let newOwnerNumber = null;
            
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentionedJid && mentionedJid.length > 0) {
                newOwnerJid = mentionedJid[0];
                newOwnerNumber = cleanNumber(newOwnerJid);
            }
            
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            if (!newOwnerJid && quotedMsg?.participant) {
                newOwnerJid = quotedMsg.participant;
                newOwnerNumber = cleanNumber(newOwnerJid);
            }
            
            if (!newOwnerJid || !newOwnerNumber) {
                return await replyWithContext(`🌌 Debes mencionar o responder al usuario que será el nuevo dueño`);
            }
            
            if (newOwnerNumber === senderNumberClean) {
                return await replyWithContext(`🌌 *No puedes transferir la propiedad a ti mismo*`);
            }
            
            const botConfig = getBotConfigPath(sock);
            if (!botConfig) {
                throw new Error('No se pudo encontrar la configuración del bot');
            }
            
            const configPath = botConfig.path;
            
            if (!fs.existsSync(configPath)) {
                throw new Error(`No se encontró configuración en: ${configPath}`);
            }
            
            let configContent = fs.readFileSync(configPath, 'utf8');
            const botownerRegex = /(botowner:\s*['"])([^'"]+)(['"])/;
            const match = configContent.match(botownerRegex);
            
            if (!match) {
                throw new Error('No se encontró el campo botowner en la configuración');
            }
            
            const oldOwner = match[2];
            const newConfigContent = configContent.replace(botownerRegex, `$1${newOwnerNumber}$3`);
            fs.writeFileSync(configPath, newConfigContent, 'utf8');
            
            if (options.config) options.config.botowner = newOwnerNumber;
            
            console.log(`👑 Botowner transferido de ${oldOwner} a ${newOwnerNumber}`);
            await replyWithContext(`「✰」 Propiedad transferida a @${newOwnerNumber} con éxito`, [newOwnerJid]);
            
        } catch (error) {
            console.error('Error en setbotowner:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};