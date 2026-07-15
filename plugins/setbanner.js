import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import axios from 'axios';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERHASH = '7eac01ee208c76d5f57056c68';

function cleanNumber(number) {
    if (!number) return '';
    let cleaned = number.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

function generateUniqueFilename(mime) {
    const ext = mime.split('/')[1] || 'jpg';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${id}.${ext}`;
}

async function uploadToCatbox(buffer, mime) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('userhash', USERHASH);
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

function getBotConfigPath(sock) {
    let botNumber = '';
    if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
    } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
    }
    
    if (!botNumber) return null;
    
    // Primero verificar si es sub-bot
    const subBotPath = path.join(process.cwd(), 'subs', botNumber, 'config.js');
    if (fs.existsSync(subBotPath)) {
        return { path: subBotPath, type: 'sub-bot', number: botNumber };
    }
    
    // Si no, es bot principal
    const mainPath = path.join(process.cwd(), 'config.js');
    if (fs.existsSync(mainPath)) {
        return { path: mainPath, type: 'main', number: botNumber };
    }
    
    return null;
}

export default {
    name: 'setbanner',
    alias: ['botbanner', 'banner'],
    description: 'Cambia el banner del bot (Solo dueño del bot) - Solo imágenes JPG/JPEG',
    category: 'sub-bot',
    
    execute: async (sock, msg, options) => {
        try {
            const { config, senderNumber, replyWithContext, userNumber } = options;
            const from = msg.key.remoteJid;
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            const userNumberClean = cleanNumber(senderNumber || userNumber || '');
            const botownerClean = config.botowner ? cleanNumber(config.botowner) : '';
            
            if (!botownerClean || userNumberClean !== botownerClean) {
                return await replyWithContext(`❀ *Solo el dueño de este bot puede cambiar su banner*`);
            }
            
            if (!quotedMsg) {
                return await replyWithContext(`♡ Debes responder a una imagen JPG o JPEG para establecer como banner`);
            }
            
            const botConfig = getBotConfigPath(sock);
            if (!botConfig) {
                throw new Error('No se pudo encontrar la configuración del bot');
            }
            
            const configPath = botConfig.path;
            
            if (!fs.existsSync(configPath)) {
                throw new Error(`No se encontró configuración en: ${configPath}`);
            }
            
            const imageMessage = quotedMsg.imageMessage;
            
            if (!imageMessage) {
                return await replyWithContext(`♡ Solo se permiten imágenes. Debes responder a una imagen JPG o JPEG`);
            }
            
            const mimetype = imageMessage.mimetype || '';
            if (!mimetype.includes('jpeg') && !mimetype.includes('jpg')) {
                return await replyWithContext(`♡ Solo se permiten imágenes JPG o JPEG`);
            }
            
            const quotedMsgObj = {
                key: {
                    remoteJid: from,
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant,
                    fromMe: false
                },
                message: { imageMessage: imageMessage }
            };
            
            const mediaBuffer = await downloadMediaMessage(quotedMsgObj, 'buffer', {}, {
                logger: console,
                reuploadRequest: sock.updateMediaMessage
            });
            
            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('Buffer de medio vacío');
            }
            
            // Limitar tamaño a 5MB
            const maxSize = 5 * 1024 * 1024;
            if (mediaBuffer.length > maxSize) {
                throw new Error(`La imagen es demasiado grande (máx 5MB)`);
            }
            
            // Mostrar reacción de subida
            try {
                await sock.sendMessage(from, { react: { text: '☁️', key: msg.key } });
            } catch (e) {}
            
            // Subir a Catbox
            const catboxUrl = await uploadToCatbox(mediaBuffer, mimetype);
            
            // Leer archivo de configuración
            let configContent = fs.readFileSync(configPath, 'utf8');
            
            // Actualizar banner en la configuración
            const bannerRegex = /(banner:\s*['"])([^'"]*)(['"])/;
            
            if (bannerRegex.test(configContent)) {
                // Si ya existe banner, reemplazar
                configContent = configContent.replace(bannerRegex, `$1${catboxUrl}$3`);
            } else {
                // Si no existe, agregarlo después de prefix o al inicio
                const prefixRegex = /(prefix:\s*['"][^'"]+['"])/;
                if (prefixRegex.test(configContent)) {
                    configContent = configContent.replace(prefixRegex, `$1,\n  banner: '${catboxUrl}'`);
                } else {
                    configContent = configContent.replace(/(export default\s*\{)/, `$1\n  banner: '${catboxUrl}',`);
                }
            }
            
            fs.writeFileSync(configPath, configContent, 'utf8');
            
            // Actualizar memoria
            if (options.config) {
                options.config.banner = catboxUrl;
            }
            
            await replyWithContext(`❀ *Banner actualizado*\n\n> Tipo: Imagen JPG\n> Tamaño: ${(mediaBuffer.length / 1024).toFixed(2)} KB\n> URL: ${catboxUrl}`);
            
            // Reacción de éxito
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
        } catch (error) {
            console.error('Error en setbanner:', error);
            try {
                const { replyWithContext } = options;
                
                if (error.response?.status === 412) {
                    await replyWithContext(`❌ *Error:* Archivo demasiado grande o formato no soportado por Catbox\n> Tamaño máximo: 5MB\n> Formatos: JPG, JPEG`);
                } else {
                    await replyWithContext(`🌼 Error: ${error.message}`);
                }
            } catch (e) {}
        }
    }
};