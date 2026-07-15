import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import pkg from 'node-webpmux';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const { Image } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempFolder = path.join(__dirname, '../databases/');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

// Cargar metadatos
function loadUserMetadata() {
    try {
        const metadataFile = path.join(__dirname, '../databases/user_metadata.json');
        if (fs.existsSync(metadataFile)) {
            const data = fs.readFileSync(metadataFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Error cargando metadatos:', error);
    }
    return {};
}

function getUserMetadata(userNumber) {
    const metadata = loadUserMetadata();
    return metadata[userNumber] || null;
}

async function getGroupName(sock, groupId) {
    try {
        if (groupId.endsWith('@g.us')) {
            const groupMetadata = await sock.groupMetadata(groupId);
            return groupMetadata.subject || 'Grupo';
        }
    } catch (error) {
        console.log('Error obteniendo nombre del grupo:', error);
    }
    return 'Grupo';
}

function randomFileName(ext) {
    return `${randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`;
}

// --- FIX 1: Sin comillas en scale + 512x512 ---
async function imageToWebp(media) {
    const tmpIn = path.join(tempFolder, randomFileName('jpg'));
    const tmpOut = path.join(tempFolder, randomFileName('webp'));
    fs.writeFileSync(tmpIn, media);

    return new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
          .on('error', (err) => {
                fs.unlinkSync(tmpIn);
                if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
                reject(err);
            })
          .on('end', () => {
                const buff = fs.readFileSync(tmpOut);
                fs.unlinkSync(tmpIn);
                fs.unlinkSync(tmpOut);
                resolve(buff);
            })
          .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                "-lossless", "1",
                "-qscale", "1",
                "-preset", "picture",
                "-an",
                "-vsync", "0"
            ])
          .toFormat('webp')
          .save(tmpOut);
    });
}

// --- FIX 2: Sin comillas + max 10s + -an ---
async function videoToWebp(media) {
    const tmpIn = path.join(tempFolder, randomFileName('mp4'));
    const tmpOut = path.join(tempFolder, randomFileName('webp'));
    fs.writeFileSync(tmpIn, media);

    return new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
          .on('error', (err) => {
                fs.unlinkSync(tmpIn);
                if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
                reject(err);
            })
          .on('end', () => {
                try {
                    const buff = fs.readFileSync(tmpOut);
                    fs.unlinkSync(tmpIn);
                    fs.unlinkSync(tmpOut);
                    resolve(buff);
                } catch (err) {
                    reject(err);
                }
            })
          .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                "-loop", "0",
                "-ss", "00:00:00",
                "-t", "00:00:10", // Max 10s
                "-preset", "default",
                "-an", // Sin audio
                "-vsync", "0"
            ])
          .toFormat('webp')
          .save(tmpOut);
    });
}

// --- EXIF Galaxit ---
async function addExif(webpBuffer, metadata) {
    const tmpIn = path.join(tempFolder, randomFileName('webp'));
    const tmpOut = path.join(tempFolder, randomFileName('webp'));
    fs.writeFileSync(tmpIn, webpBuffer);

    const botName = metadata.botName || 'Galaxit Bot';
    const userName = metadata.userName || 'Anónimo';

    const packNameText = `🌌 Bot: Chocola
🛠️ https://galaxit.club.com
📌 Galaxit-club`;

    const authorText = `🌃 Usuario: ${userName}`;

    const json = {
        "sticker-pack-id": `galaxit_${metadata.senderNumber || '0'}`,
        "sticker-pack-name": packNameText,
        "sticker-pack-publisher": authorText,
        "emojis": ["🌌", "🛠️", "📌"]
    };

    const exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00,
        0x08, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x16, 0x00,
        0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    const img = new Image();
    await img.load(tmpIn);
    img.exif = exif;
    await img.save(tmpOut);
    fs.unlinkSync(tmpIn);
    return tmpOut;
}

async function writeExifImg(media, metadata) {
    const wMedia = await imageToWebp(media);
    return await addExif(wMedia, metadata);
}

async function writeExifVid(media, metadata) {
    const wMedia = await videoToWebp(media);
    return await addExif(wMedia, metadata);
}

export default {
    name: 's',
    alias: ['sticker', 'stiker'],
 category: 'Main',

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;

            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                await sock.sendMessage(from, {
                    text: `🌌 Para usar mis comandos tienes que estar registrado.\n> Uso: ${config.prefix}reg nombre`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            await sock.sendPresenceUpdate('composing', from);

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            if (!quotedMsg?.quotedMessage) {
                await sock.sendMessage(from, {
                    text: `🌠 Responde a una imagen, video o sticker\nUso: ${config.prefix}s [nombre|autor]`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            const quotedMessage = quotedMsg.quotedMessage;
            let mediaType;
            let mediaMessage;

            if (quotedMessage.imageMessage) {
                mediaType = 'image';
                mediaMessage = quotedMessage.imageMessage;
            } else if (quotedMessage.videoMessage) {
                mediaType = 'video';
                mediaMessage = quotedMessage.videoMessage;
            } else if (quotedMessage.stickerMessage) {
                mediaType = 'sticker';
                mediaMessage = quotedMessage.stickerMessage;
            } else {
                await sock.sendMessage(from, {
                    text: '🌌 Solo imágenes, videos o stickers',
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(from, { react: { text: '🌌', key: msg.key } });

            const userMetadata = getUserMetadata(senderNumber);

            const quotedMsgObj = {
                key: {
                    remoteJid: from,
                    id: quotedMsg.stanzaId,
                    participant: quotedMsg.participant || from,
                    fromMe: false
                },
                message: {
                    [mediaType + 'Message']: mediaMessage
                }
            };

            const buffer = await downloadMediaMessage(
                quotedMsgObj,
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );

            if (!buffer || buffer.length === 0) {
                throw new Error('No se pudo descargar el archivo');
            }

            const maxSize = mediaType === 'video'? 10 * 1024 * 1024 : 5 * 1024 * 1024;
            if (buffer.length > maxSize) {
                throw new Error(`Archivo demasiado grande (máx ${maxSize / 1024 / 1024}MB)`);
            }

            let stickerPath;
            const metadata = {
                botName: config.name || 'Galaxit Bot',
                userName: pushName || senderNumber,
                senderNumber: senderNumber
            };

            try {
                if (mediaType === 'sticker') {
                    stickerPath = await addExif(buffer, metadata);
                } else if (mediaType === 'image') {
                    stickerPath = await writeExifImg(buffer, metadata);
                } else {
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Timeout procesando video (máx 30s)')), 30000);
                    });
                    stickerPath = await Promise.race([writeExifVid(buffer, metadata), timeoutPromise]);
                }
            } catch (processError) {
                console.error('Error procesando:', processError);
                throw new Error(`Error al convertir: ${processError.message}`);
            }

            await sock.sendMessage(from, {
                sticker: fs.readFileSync(stickerPath),
                contextInfo: {
                    mentionedJid: [senderJid],
                    forwardingScore: 9999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });

            try { fs.unlinkSync(stickerPath); } catch (e) {}

            await sock.sendMessage(from, { react: { text: '✨', key: msg.key } });
            console.log(`✅ Sticker creado para ${pushName || senderNumber} (${mediaType})`);

        } catch (error) {
            console.error('❌ Error en sticker:', error);
            try { await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } }); } catch (e) {}
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `📌 Error: ${error.message}`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: options.config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: options.config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            } catch (e) {}
        }
    }
};