import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_PREFIXES = ['.', '/', '-', '#', '!'];

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
    name: 'setbotprefix',
    alias: ['botprefix', 'setprefix'],
    description: 'Cambia el prefijo del bot (solo dueño del bot)',
    category: 'sub-bot',
    
    async execute(sock, msg, options) {
        try {
            const { config, args, senderNumber, replyWithContext, userNumber } = options;
            
            const userNumberClean = cleanNumber(senderNumber || userNumber || '');
            const botownerClean = config.botowner ? cleanNumber(config.botowner) : '';
            
            if (!botownerClean || userNumberClean !== botownerClean) {
                return await replyWithContext(`🌌 *Solo el dueño de este bot puede cambiar su prefijo*`);
            }
            
            const botConfig = getBotConfigPath(sock);
            if (!botConfig) {
                throw new Error('No se pudo encontrar la configuración del bot');
            }
            
            const configPath = botConfig.path;
            
            if (!fs.existsSync(configPath)) {
                throw new Error(`No se encontró configuración en: ${configPath}`);
            }
            
            if (args && args.length > 0) {
                let newPrefix = args[0];
                if (newPrefix.startsWith('+')) newPrefix = newPrefix.substring(1).trim();
                if (!newPrefix || newPrefix.length === 0) {
                    return await replyWithContext(`*ᰔᩚ* *El prefijo no puede estar vacío*`);
                }
                if (!ALLOWED_PREFIXES.includes(newPrefix)) {
                    return await replyWithContext(`🌌 *Prefijo no permitido*\n\n> *Prefijos permitidos:* ${ALLOWED_PREFIXES.join(', ')}`);
                }
                
                let configContent = fs.readFileSync(configPath, 'utf8');
                const prefixRegex = /(prefix:\s*['"])([^'"]+)(['"])/;
                const match = configContent.match(prefixRegex);
                
                if (!match) throw new Error('No se encontró el campo prefix en la configuración');
                
                const oldPrefix = match[2];
                const newConfigContent = configContent.replace(prefixRegex, `$1${newPrefix}$3`);
                fs.writeFileSync(configPath, newConfigContent, 'utf8');
                
                if (options.config) options.config.prefix = newPrefix;
                
                return await replyWithContext(`🌌 Prefijo actualizado con éxito\n\n> *Nuevo prefijo:* ${newPrefix}\n> *Anterior:* ${oldPrefix}`);
            }
            
            const rows = ALLOWED_PREFIXES.map(prefix => ({
                title: `Prefijo: "${prefix}"`,
                description: `Cambiar el prefijo del bot a "${prefix}"`,
                id: `${config.prefix}botprefix ${prefix}`
            }));
            
            const sections = [{ title: "PREFIJOS DISPONIBLES", rows: rows }];
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: "「✰」 *Selecciona un prefijo para el bot*",
                footer: "© Moonlight Staff",
                interactiveButtons: [{
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({ title: "Seleccionar", sections: sections })
                }],
                contextInfo: {
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
        } catch (error) {
            console.error('Error en setbotprefix:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};