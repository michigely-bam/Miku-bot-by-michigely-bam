import axios from 'axios';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import FormData from 'form-data';

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function generateUniqueFilename(mime) {
    const ext = mime.split('/')[1] || 'bin';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${id}.${ext}`;
}

async function uploadCatbox(buffer, mime) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: generateUniqueFilename(mime) });

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
    });

    if (typeof res.data !== 'string' || !res.data.startsWith('https://')) {
        throw new Error('Respuesta inválida de Catbox');
    }
    return res.data;
}

async function uploadUguu(buffer) {
    const form = new FormData();
    form.append('files[]', buffer, generateUniqueFilename('image/jpeg'));

    const res = await axios.post('https://uguu.se/upload.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
    });

    const url = res.data?.files?.[0]?.url;
    if (!url) throw new Error('Respuesta inválida de Uguu');
    return url;
}

async function uploadQuax(buffer, mime) {
    const form = new FormData();
    form.append('file', buffer, { filename: generateUniqueFilename(mime), contentType: mime });

    const res = await axios.post('https://qu.ax/upload.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
    });

    const url = res.data?.files?.[0]?.url;
    if (!url) throw new Error('Respuesta inválida de Quax');
    return url;
}

async function uploadAuto(buffer, mime) {
    try {
        return { link: await uploadCatbox(buffer, mime), server: 'catbox' };
    } catch {
        try {
            return { link: await uploadUguu(buffer), server: 'uguu' };
        } catch {
            return { link: await uploadQuax(buffer, mime), server: 'quax' };
        }
    }
}

export default {
    name: 'tourl',
    alias: ['toupload', 'upload', 'subir'],
    description: 'Sube una imagen o video a la nube y obtiene un enlace',
    category: 'tools',
    
    async execute(sock, msg, options) {
        try {
            const { config, replyWithContext } = options;
            const from = msg.key.remoteJid;
            
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            if (!quotedMsg?.quotedMessage) {
                return await replyWithContext(`🌌 Responde a una imagen o video.\n\n> Ejemplo: Responde a una imagen con ${config.prefix}tourl`);
            }

            const quotedMessage = quotedMsg.quotedMessage;
            const isImage = quotedMessage.imageMessage;
            const isVideo = quotedMessage.videoMessage;
            
            if (!isImage && !isVideo) {
                return await replyWithContext(`🌌 Responde a una imagen o video.`);
            }
            
            const media = isImage || isVideo;
            const type = isImage ? 'image' : 'video';
            const mime = isImage ? (media.mimetype || 'image/jpeg') : (media.mimetype || 'video/mp4');
            
            try {
                await sock.sendMessage(from, { react: { text: '📤', key: msg.key } });
            } catch (e) {}
            
            const quotedMsgObj = {
                key: {
                    remoteJid: from,
                    id: quotedMsg.stanzaId,
                    participant: quotedMsg.participant || from,
                    fromMe: false
                },
                message: {
                    [type + 'Message']: media
                }
            };
            
            const buffer = await downloadMediaMessage(
                quotedMsgObj,
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );
            
            if (!buffer || buffer.length === 0) {
                throw new Error('No se pudo descargar el archivo');
            }
            
            const maxSize = 30 * 1024 * 1024;
            if (buffer.length > maxSize) {
                throw new Error(`Archivo demasiado grande (${formatSize(buffer.length)})\n> Máx: 30MB`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '🌌', key: msg.key } });
            } catch (e) {}
            
            const upload = await uploadAuto(buffer, mime);
            
            const desc = `﹒︵͡⏜ ᅟ︵͡⏜
﹒ ─ ‎ ‎‎ ‎ 사랑 ‎ *TOURL* ‎ ‎‎ ‎ ‎ᰍ ׅ

🌌 *URL* » ${upload.link}
🌌 *Servidor* » ${upload.server}
🌌 *Tipo* » ${type === 'image' ? '📷 Imagen' : '🎬 Video'}
🌌 *Tamaño* » ${formatSize(buffer.length)}`;

            if (type === 'image') {
                await sock.sendMessage(from, { 
                    image: buffer, 
                    caption: desc,
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
            } else {
                await sock.sendMessage(from, { 
                    video: buffer, 
                    caption: desc,
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
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Tourl: ${type} subido a ${upload.server} (${formatSize(buffer.length)})`);
            
        } catch (error) {
            console.error('❌ Error en tourl:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ *Error:* ${error.message}`);
            } catch (e) {}
        }
    }
};