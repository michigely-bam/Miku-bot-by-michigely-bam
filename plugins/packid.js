import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_PACKS_FILE = path.join(__dirname, '..', 'databases', 'public_packs.json');

const loadPublicPacksDB = () => {
    try {
        if (fs.existsSync(PUBLIC_PACKS_FILE)) {
            const data = fs.readFileSync(PUBLIC_PACKS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error cargando public_packs.json:', error);
    }
    return {};
};

export default {
    name: 'packid',
    alias: ['getpackid', 'usarpack'],
 category: 'Main',
    
    async execute(sock, msg, options) {
        try {
            const { config, args, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            const packId = args.join(' ').trim();
            
            if (!packId) {
                return await sock.sendMessage(from, {
                    text: `⭐ debes proporcionar el ID del pack\n> Ejemplo: ${config.prefix}packid 1775367313608`,
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
            
            await sock.sendPresenceUpdate('composing', from);
            
            try {
                await sock.sendMessage(from, { react: { text: '📦', key: msg.key } });
            } catch (e) {}
            
            const publicPacks = loadPublicPacksDB();
            
            const pack = publicPacks[packId];
            
            if (!pack) {
                return await sock.sendMessage(from, {
                    text: `🌽 No se encontró ningún pack público con el ID *${packId}*`,
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
            
            if (!pack.stickers || pack.stickers.length === 0) {
                return await sock.sendMessage(from, {
                    text: `🍭 *El pack "${pack.name}" no tiene stickers*`,
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
            
            const validStickers = pack.stickers.map(s => {
                try {
                    return Buffer.from(s.buffer, 'base64');
                } catch {
                    return null;
                }
            }).filter(s => s && Buffer.isBuffer(s) && s.length > 0);
            
            if (validStickers.length < 4) {
                return await sock.sendMessage(from, {
                    text: `🍭 *El pack "${pack.name}" no tiene suficientes stickers válidos (mínimo 4)*`,
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
            
            const MAX_STICKERS = 50;
            const selected = validStickers.slice(0, MAX_STICKERS);
            const cover = selected[0];
            
            const webp = await import('node-webpmux');
            const stickerResults = await Promise.all(selected.map(async (buffer) => {
                try {
                    const img = new webp.default.Image();
                    await img.load(buffer);
                    const json = { 
                        'sticker-pack-id': 'https://github.com/Moonlight-Bot', 
                        'sticker-pack-name': pack.name, 
                        'sticker-pack-publisher': pack.ownerName || 'Moonlight Bot', 
                        emojis: ['✨'] 
                    };
                    const exifAttr = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
                    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
                    const exif = Buffer.concat([exifAttr, jsonBuff]);
                    exif.writeUIntLE(jsonBuff.length, 14, 4);
                    img.exif = exif;
                    const tmpOut = `./temp/pack-sticker-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
                    await img.save(tmpOut);
                    const stickerBuf = fs.readFileSync(tmpOut);
                    fs.unlinkSync(tmpOut);
                    return { sticker: stickerBuf, isAnimated: false, isLottie: false, emojis: ['✨'] };
                } catch {
                    return { sticker: buffer, isAnimated: false, isLottie: false, emojis: ['✨'] };
                }
            }));
            
            await sock.sendMessage(from, { 
                stickerPack: { 
                    name: pack.name, 
                    publisher: `${pack.ownerName || 'Moonlight Bot'}`,
                    description: pack.desc || `Paquete de stickers`,
                    cover: cover, 
                    stickers: stickerResults 
                } 
            }, { quoted: msg });
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Pack ID "${packId}" enviado por ${pushName || 'Usuario'} - ${selected.length} stickers`);
            
        } catch (error) {
            console.error('❌ Error en packid:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
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