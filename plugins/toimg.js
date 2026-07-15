import { downloadMediaMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

function getTempFilePath(extension) {
    return path.join(tempFolder, `toimg_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`);
}

async function convertWebp(webpBuffer, isAnimated) {
    const inputPath = getTempFilePath('webp');
    const outputPath = isAnimated ? getTempFilePath('mp4') : getTempFilePath('jpg');
    
    fs.writeFileSync(inputPath, webpBuffer);
    
    try {
        if (isAnimated) {
            // Conversión de Sticker Animado a MP4 usando FFmpeg directamente
            await execAsync(`ffmpeg -i "${inputPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -pix_fmt yuv420p -movflags faststart "${outputPath}" -y`);
        } else {
            // Conversión de Sticker Estático a JPG usando FFmpeg
            await execAsync(`ffmpeg -i "${inputPath}" "${outputPath}" -y`);
        }
        
        if (!fs.existsSync(outputPath)) throw new Error('Error en la conversión');
        
        const buffer = fs.readFileSync(outputPath);
        return { buffer, outputPath };
    } finally {
        try { fs.unlinkSync(inputPath); } catch (e) {}
    }
}

export default {
    name: 'toimg',
    alias: ['toimage'],
 category: 'Herramientas',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid } = options;
            const from = msg.key.remoteJid;
            
            // Verificación de registro (Mantenida según tu código original)
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                await sock.sendMessage(from, { 
                    text: `🍒 Debes estar registrado.\n> Uso: ${config.prefix}reg nombre`,
                }, { quoted: msg });
                return;
            }

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            if (!quotedMsg?.quotedMessage) {
                await sock.sendMessage(from, { text: `🌺 Responde a un sticker, imagen o video` }, { quoted: msg });
                return;
            }

            const quotedMessage = quotedMsg.quotedMessage;
            let mediaType = quotedMessage.stickerMessage ? 'sticker' : 
                            quotedMessage.imageMessage ? 'image' : 
                            quotedMessage.videoMessage ? 'video' : null;

            if (!mediaType) {
                await sock.sendMessage(from, { text: `🌺 Solo stickers, imágenes o videos` }, { quoted: msg });
                return;
            }

            await sock.sendPresenceUpdate('composing', from);
            try { await sock.sendMessage(from, { react: { text: "🔄", key: msg.key } }); } catch (e) {}

            const quotedMsgObj = {
                key: { remoteJid: from, id: quotedMsg.stanzaId, participant: quotedMsg.participant || from, fromMe: false },
                message: { [mediaType + 'Message']: quotedMessage[mediaType + 'Message'] }
            };
            
            const mediaBuffer = await downloadMediaMessage(quotedMsgObj, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });

            if (!mediaBuffer || mediaBuffer.length === 0) throw new Error('No se pudo descargar el archivo');

            const contextInfo = {
                mentionedJid: [senderJid],
                forwardingScore: 9999999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.canalId || '',
                    newsletterName: config.canalNombre || ''
                }
            };

            if (mediaType === 'sticker') {
                const isAnimated = quotedMessage.stickerMessage.isAnimated || false;
                const { buffer, outputPath } = await convertWebp(mediaBuffer, isAnimated);
                
                if (isAnimated) {
                    await sock.sendMessage(from, { video: buffer, mimetype: 'video/mp4', contextInfo }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { image: buffer, mimetype: 'image/jpeg', contextInfo }, { quoted: msg });
                }
                try { fs.unlinkSync(outputPath); } catch (e) {}
            } 
            else if (mediaType === 'image') {
                await sock.sendMessage(from, { image: mediaBuffer, mimetype: 'image/jpeg', contextInfo }, { quoted: msg });
            } 
            else if (mediaType === 'video') {
                await sock.sendMessage(from, { video: mediaBuffer, mimetype: 'video/mp4', contextInfo }, { quoted: msg });
            }

            try { await sock.sendMessage(from, { react: { text: "✅", key: msg.key } }); } catch (e) {}

        } catch (error) {
            console.error(`❌ Error:`, error);
            try { await sock.sendMessage(msg.key.remoteJid, { react: { text: "❌", key: msg.key } }); } catch (e) {}
            await sock.sendMessage(msg.key.remoteJid, { text: `🌠 Error: ${error.message}` }, { quoted: msg });
        }
    }
};
