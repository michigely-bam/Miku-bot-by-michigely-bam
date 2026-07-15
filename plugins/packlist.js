import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKS_FILE = path.join(__dirname, '..', 'databases', 'packs.json');

const loadPacksDB = () => {
    try {
        if (fs.existsSync(PACKS_FILE)) {
            const data = fs.readFileSync(PACKS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error cargando packs.json:', error);
    }
    return {};
};

export default {
    name: 'packlist',
    alias: ['listpacks'],
 category: 'Main',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, args, pushName } = options;
            const from = msg.key.remoteJid;
            
            let targetNumber = senderNumber;
            let targetName = pushName;
            let targetJid = senderJid;
            let isOther = false;
            
            const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            
            if (mentionedJid) {
                targetJid = mentionedJid;
                targetNumber = mentionedJid.split('@')[0];
                targetName = args.join(' ').replace(`@${targetNumber}`, '').trim() || 'Usuario';
                isOther = true;
            } else if (args.length > 0) {
                const possibleNumber = args[0].replace(/[^0-9]/g, '');
                if (possibleNumber && possibleNumber.length > 8) {
                    targetNumber = possibleNumber;
                    targetName = args.slice(1).join(' ') || `Usuario ${targetNumber}`;
                    targetJid = `${targetNumber}@s.whatsapp.net`;
                    isOther = true;
                }
            }
            
            const packsDB = loadPacksDB();
            const userData = packsDB[targetNumber];
            
            if (!userData || !userData.packs || userData.packs.length === 0) {
                return await sock.sendMessage(from, {
                    text: `「✰」${isOther ? targetName : 'No tienes'} packs creados`,
                    contextInfo: {
                        mentionedJid: isOther ? [targetJid] : [senderJid],
                        forwardingScore: 9999999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            }
            
            let packsList = '';
            
            for (const pack of userData.packs) {
                packsList += `❱❱ *Nombre* » ${pack.name}\n`;
                packsList += `❱❱ *Stickers* » ${pack.stickers.length}/50\n`;
                packsList += `❱❱ *Fecha* » ${pack.createdAt}\n\n`;
            }
            
            const message = `ᅟ＼＿＿ 🌊ᤳ *Lista de Packs*\n\n` +
                          `★ *Usuario* » ${isOther ? targetName : pushName}\n` +
                          `★ *Packs* » ${userData.packs.length}\n\n` +
                          `${packsList}`;
            
            await sock.sendMessage(from, {
                text: message,
                contextInfo: {
                    mentionedJid: isOther ? [targetJid] : [senderJid],
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
            console.error('❌ Error en packlist:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${error.message}`,
                contextInfo: {
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: options.config?.canalId || '',
                        serverMessageId: 0,
                        newsletterName: options.config?.canalNombre || ''
                    }
                }
            }, { quoted: msg });
        }
    }
};