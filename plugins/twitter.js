import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

const APIS = [
    {
        name: 'OotaIzumi',
        url: 'https://api.ootaizumi.web.id/downloader/twitter',
        getMedia: (data) => {
            if (!data.status || !data.result || data.result.length === 0) return null;
            return data.result.map(item => ({
                type: item.type === 'image' ? 'photo' : item.type,
                link: item.link
            }));
        }
    },
    {
        name: 'NexRay',
        url: 'https://api.nexray.web.id/downloader/twitter',
        getMedia: (data) => {
            if (!data.status || !data.result) return null;
            const downloadUrls = data.result.download_url || [];
            if (downloadUrls.length === 0) return null;
            return downloadUrls.map(item => ({
                type: item.type === 'image' ? 'photo' : 'video',
                link: item.url,
                thumbnail: item.thumbnail
            }));
        }
    }
];

export default {
    name: 'twitter',
    alias: ['tw', 'x', 'twitterdl'],
 category: 'descargas',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, pushName, senderNumber } = options;
            const from = msg.key.remoteJid;
            const url = args[0];
            
            if (!url) {
                await sock.sendMessage(from, {
                    text: `❀ Te faltó el link de una imagen/video de Twitter/X.\n> Uso: ${config.prefix}twitter [enlace]`
                }, { quoted: msg });
                return;
            }
            
            if (!url.includes('twitter.com') && !url.includes('x.com')) {
                await sock.sendMessage(from, {
                    text: `♡ Eso no parece ser un enlace de Twitter/X válido`
                }, { quoted: msg });
                return;
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
            } catch (e) {}
            
            let mediaItems = null;
            let usedApi = '';
            
            // Intentar con cada API
            for (const api of APIS) {
                try {
                    console.log(`🔍 [API ${api.name}] Consultando: ${api.url}?url=${encodeURIComponent(url)}`);
                    
                    const response = await axios.get(api.url, {
                        params: { url: url },
                        timeout: 30000,
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    mediaItems = api.getMedia(response.data);
                    
                    if (mediaItems && mediaItems.length > 0) {
                        usedApi = api.name;
                        console.log(`✅ [API ${api.name}] ${mediaItems.length} archivos encontrados`);
                        break;
                    }
                    
                } catch (error) {
                    console.log(`⚠️ [API ${api.name}] Falló: ${error.message}`);
                    continue;
                }
            }
            
            if (!mediaItems || mediaItems.length === 0) {
                throw new Error('No se pudo obtener el contenido de Twitter/X con ninguna API');
            }
            
            // Separar videos e imágenes
            const videos = mediaItems.filter(item => item.type === 'video' && item.link);
            const photos = mediaItems.filter(item => (item.type === 'photo' || item.type === 'image') && item.link);
            
            if (videos.length > 0) {
                // ============ ENVIAR VIDEO ============
                const videoUrl = videos[0].link;
                
                console.log(`📥 Descargando video de Twitter (${usedApi})...`);
                
                const tempDir = path.join(__dirname, '..', 'temp');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                
                const tempFile = path.join(tempDir, `twitter_${Date.now()}.mp4`);
                const convertedFile = path.join(tempDir, `twitter_conv_${Date.now()}.mp4`);
                
                // Descargar video
                const videoResponse = await axios({
                    method: 'get',
                    url: videoUrl,
                    responseType: 'stream',
                    timeout: 120000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://twitter.com/'
                    }
                });
                
                const writer = fs.createWriteStream(tempFile);
                videoResponse.data.pipe(writer);
                
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                
                const stats = fs.statSync(tempFile);
                console.log(`✅ Video descargado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Intentar enviar sin convertir primero
                try {
                    await sock.sendMessage(from, {
                        video: { url: tempFile },
                        caption: `✿ *Twitter Download* ✿`,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                    
                    console.log(`✅ Video enviado sin conversión`);
                    
                } catch (sendError) {
                    console.log(`⚠️ Necesita conversión: ${sendError.message}`);
                    
                    // Convertir video
                    const ffmpegCmd = `ffmpeg -i "${tempFile}" -c:v libx264 -preset ultrafast -crf 28 -c:a aac -b:a 64k -movflags +faststart -vf "scale=ceil(iw/2)*2:ceil(ih/2)*2" -pix_fmt yuv420p -r 24 -max_muxing_queue_size 1024 "${convertedFile}" -y -loglevel error`;
                    
                    await execAsync(ffmpegCmd);
                    
                    const convertedStats = fs.statSync(convertedFile);
                    console.log(`✅ Video convertido: ${(convertedStats.size / 1024 / 1024).toFixed(2)} MB`);
                    
                    await sock.sendMessage(from, {
                        video: { url: convertedFile },
                        caption: `✿ *Twitter Download* ✿`,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                    
                    try { fs.unlinkSync(convertedFile); } catch (e) {}
                }
                
                try { fs.unlinkSync(tempFile); } catch (e) {}
                
            } else if (photos.length > 0) {
                // ============ ENVIAR IMÁGENES ============
                for (let i = 0; i < photos.length; i++) {
                    const photoUrl = photos[i].link;
                    
                    console.log(`📥 Descargando imagen ${i + 1}/${photos.length} (${usedApi})...`);
                    
                    try {
                        const imageResponse = await axios({
                            method: 'get',
                            url: photoUrl,
                            responseType: 'arraybuffer',
                            timeout: 30000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });
                        
                        const imageBuffer = Buffer.from(imageResponse.data);
                        
                        await sock.sendMessage(from, {
                            image: imageBuffer,
                            caption: `✿ *Twitter Download* ✿\n> Imagen ${i + 1}/${photos.length}`,
                        }, { quoted: msg });
                        
                        console.log(`✅ Imagen ${i + 1} enviada: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
                        
                    } catch (imgError) {
                        console.log(`⚠️ Error descargando imagen ${i + 1}: ${imgError.message}`);
                    }
                }
                
            } else {
                throw new Error('No se encontró contenido descargable');
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ Twitter descargado por ${pushName || senderNumber} [${usedApi}]`);
            
        } catch (error) {
            console.error('❌ Error en comando twitter:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `ꕤ Error: ${error.message}`
            }, { quoted: msg });
        }
    }
};