import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

function getTempFilePath(extension) {
    return path.join(tempFolder, `gitclone_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`);
}

export default {
    name: 'gitclone',
    alias: ['githubclone', 'clonar'],
    description: 'Descarga un repositorio de GitHub',
    category: 'download',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, pushName, userNumber, replyWithContext, senderJid } = options;
            const from = msg.key.remoteJid;
            const url = args.join(' ').trim();
            
            if (!url) {
                await sock.sendMessage(from, { react: { text: '✖️', key: msg.key } });
                return await replyWithContext(`「✰」 Debes proporcionar un enlace de GitHub\n> Ejemplo: ${config.prefix}gitclone https://github.com/iamDestroy/YukiBot-MD/`);
            }
            
            // Verificar que sea un enlace de GitHub
            if (!url.includes('github.com')) {
                await sock.sendMessage(from, { react: { text: '✖️', key: msg.key } });
                return await replyWithContext(`🌌 El enlace debe ser de GitHub`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '📥', key: msg.key } });
            } catch (e) {}
            
            // --- OBTENER INFORMACIÓN DEL REPOSITORIO ---
            const apiUrl = `https://api.delirius.store/download/gitclone?url=${encodeURIComponent(url)}`;
            
            const response = await axios.get(apiUrl, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (!response.data?.status || !response.data?.data) {
                throw new Error('No se pudo obtener la información del repositorio');
            }
            
            const repo = response.data.data;
            
            // --- ENVIAR INFORMACIÓN DEL REPOSITORIO ---
            const infoText = `🌐 *${repo.name}*\n\n` +
                           `👤 *Autor:* ${repo.creator}\n` +
                           `🔍 *Lenguaje:* ${repo.language || 'No especificado'}\n` +
                           `⭐ *Estrellas:* ${repo.stargazers}\n` +
                           `ℹ️ *Forks:* ${repo.forks}\n` +
                           `📂 *Tamaño:* ${repo.size}\n` +
                           `👑 *Creado:* ${repo.created}\n` +
                           `⚙️ *Actualizado:* ${repo.updated}\n\n` +
                           `📄 *Descripción:* ${repo.description || 'Sin descripción'}\n\n` +
                           `> *Solicitado por:* ${pushName || userNumber}`;
            
            // Enviar imagen del avatar si existe
            if (repo.image) {
                try {
                    const imgResponse = await axios.get(repo.image, { responseType: 'arraybuffer', timeout: 15000 });
                    const imgBuffer = Buffer.from(imgResponse.data);
                    
                    await sock.sendMessage(from, {
                        image: imgBuffer,
                        caption: infoText,
                        contextInfo: {
                            mentionedJid: senderJid ? [senderJid] : [],
                            forwardingScore: 9999999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                } catch (e) {
                    await sock.sendMessage(from, { text: infoText }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(from, { text: infoText }, { quoted: msg });
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '📦', key: msg.key } });
            } catch (e) {}
            
            // --- DESCARGAR EL REPOSITORIO ---
            const downloadUrl = repo.download;
            if (!downloadUrl) {
                throw new Error('No se pudo obtener el enlace de descarga');
            }
            
            const zipResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 120000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/zip'
                }
            });
            
            const zipBuffer = Buffer.from(zipResponse.data);
            const fileName = `${repo.name.replace(/[^a-zA-Z0-9]/g, '_')}.zip`;
            
            try {
                await sock.sendMessage(from, { react: { text: '📤', key: msg.key } });
            } catch (e) {}
            
            // --- ENVIAR EL ARCHIVO ZIP ---
            await sock.sendMessage(from, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: fileName,
                caption: `「✰」 Repositorio: ${repo.name}\n「✰」 Tamaño: ${(zipBuffer.length / 1024 / 1024).toFixed(2)} MB`,
                contextInfo: {
                    mentionedJid: senderJid ? [senderJid] : [],
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Gitclone: ${repo.full_name} descargado por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en gitclone:', error);
            
            // Solo reaccionar con ✖️
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '✖️', key: msg.key } });
            } catch (e) {}
            
            // No enviar mensaje de error
        }
    }
};