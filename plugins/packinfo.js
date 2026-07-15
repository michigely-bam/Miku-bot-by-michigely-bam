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
    name: 'packinfo',
    alias: ['infopack'],
 category: 'Main',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, args, pushName } = options;
            const from = msg.key.remoteJid;
            
            const packName = args.join(' ').trim();
            
            if (!packName) {
                return await sock.sendMessage(from, {
                    text: `🌸 *Debes proporcionar el nombre del pack*\n\n> Ejemplo: ${config.prefix}packinfo Mis Stickers`,
                    contextInfo: {
                        mentionedJid: [senderJid],
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
            
            const packsDB = loadPacksDB();
            
            if (!packsDB[senderNumber] || !packsDB[senderNumber].packs) {
                return await sock.sendMessage(from, {
                    text: `🌸 *No tienes ningún pack creado*`,
                    contextInfo: {
                        mentionedJid: [senderJid],
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
            
            const pack = packsDB[senderNumber].packs.find(p => p.name.toLowerCase() === packName.toLowerCase());
            
            if (!pack) {
                return await sock.sendMessage(from, {
                    text: `🌸 *No tienes un pack llamado "${packName}"*\n\n> Usa ${config.prefix}packlist para ver tus packs`,
                    contextInfo: {
                        mentionedJid: [senderJid],
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
            
            let totalSize = 0;
            pack.stickers.forEach(sticker => {
                totalSize += Buffer.from(sticker.buffer, 'base64').length;
            });
            const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
            
            const lastStickers = [...pack.stickers]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 3);
            
            let lastStickersList = '';
            lastStickers.forEach((sticker, i) => {
                lastStickersList += `${i + 1}. ID: ${sticker.id.substring(0, 8)}...\n`;
                lastStickersList += `   ${sticker.addedAt}\n`;
            });
            
            const message = `🍭 *INFORMACIÓN DEL PACK*\n\n` +
                          `❱❱ *Nombre:* ${pack.name}\n` +
                          `❱❱ *Creador:* ${pack.ownerName}\n` +
                          `❱❱ *Fecha creación:* ${pack.createdAt}\n` +
                          `❱❱ *Stickers:* ${pack.stickers.length}/50\n` +
                          `❱❱ *Espacio usado:* ${sizeMB} MB\n` +
                          `❱❱ *Últimos stickers:*\n${lastStickersList || '   No hay stickers'}`;
            
            await sock.sendMessage(from, {
                text: message,
                contextInfo: {
                    mentionedJid: [senderJid],
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
            console.error('❌ Error en packinfo:', error);
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