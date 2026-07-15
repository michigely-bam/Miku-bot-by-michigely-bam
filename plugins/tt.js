import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

function getTempFilePath(extension) {
    return path.join(tempFolder, `tt_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`);
}

export default {
    name: 'tt',
    alias: ['tiktok'],
    description: 'Descarga videos de TikTok',
    category: 'download',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, replyWithContext, pushName, userNumber } = options;
            const from = msg.key.remoteJid;
            
            const url = args[0];
            
            if (!url) {
                return await replyWithContext(`「✰」 Debes proporcionar un enlace de TikTok\n> Ejemplo: ${config.prefix}tt https://www.tiktok.com/...`);
            }
            
            if (!url.includes('tiktok.com')) {
                return await replyWithContext(`「✰」 Eso no parece ser un enlace de TikTok válido`);
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
            } catch (e) {}
            
            let resultData = null;
            let username = 'Desconocido';
            let duration = 'N/A';
            let views = '0';
            let likes = '0';
            let comments = '0';
            let shares = '0';
            let videoUrl = null;
            let mediaItems = [];
            let type = 'video';
            let author = 'Desconocido';
            let title = 'Sin título';
            let thumbnail = '';
            let apiUsada = '';
            
            // ============ PRIMERO: API IKYYXD ============
            try {
                const apiUrl = `https://api.ikyyxd.my.id/download/all-in-one?url=${encodeURIComponent(url)}`;
                const response = await axios.get(apiUrl, {
                    timeout: 30000,
                    headers: {
                        'accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    username = result.unique_id || result.author || 'Desconocido';
                    author = result.author || username;
                    title = result.title || 'Sin título';
                    duration = result.duration || 'N/A';
                    thumbnail = result.thumbnail || '';
                    
                    if (result.statistics) {
                        views = result.statistics.play_count || '0';
                        likes = result.statistics.digg_count || '0';
                        comments = result.statistics.comment_count || '0';
                        shares = result.statistics.share_count || '0';
                    }
                    
                    type = result.type || 'video';
                    
                    if (result.medias && result.medias.length > 0) {
                        const videoMedia = result.medias.find(m => m.type === 'video' && m.extension === 'mp4');
                        if (videoMedia && videoMedia.url) {
                            videoUrl = videoMedia.url;
                        }
                        
                        if (!videoUrl) {
                            const images = result.medias.filter(m => m.type === 'image');
                            if (images.length > 0) {
                                mediaItems = images;
                                type = 'images';
                            }
                        }
                    }
                    
                    if (videoUrl || mediaItems.length > 0) {
                        apiUsada = 'Ikyyxd';
                        console.log(`✅ TikTok usando API Ikyyxd: ${username}`);
                    } else {
                        throw new Error('No se encontró contenido en Ikyyxd');
                    }
                } else {
                    throw new Error('API Ikyyxd no respondió correctamente');
                }
            } catch (error) {
                console.log(`⚠️ API Ikyyxd falló: ${error.message}, probando TikWM...`);
                
                // ============ SEGUNDO: API TIKWM ============
                try {
                    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
                    const response = await axios.get(apiUrl, {
                        timeout: 30000,
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (response.data?.code === 0 && response.data?.data) {
                        const data = response.data.data;
                        username = data.author?.unique_id || 'Desconocido';
                        author = data.author?.nickname || username;
                        title = data.title || 'Sin título';
                        duration = data.duration || 'N/A';
                        thumbnail = data.cover || '';
                        
                        views = data.play_count || '0';
                        likes = data.digg_count || '0';
                        comments = data.comment_count || '0';
                        shares = data.share_count || '0';
                        
                        // Verificar si tiene imágenes (publicación de fotos)
                        if (data.images && data.images.length > 0) {
                            mediaItems = data.images.map(img => ({ url: img, type: 'image' }));
                            type = 'images';
                            apiUsada = 'TikWM';
                            console.log(`✅ TikTok (imágenes) usando API TikWM: ${username}`);
                        } else if (data.play) {
                            videoUrl = data.play;
                            type = 'video';
                            apiUsada = 'TikWM';
                            console.log(`✅ TikTok (video) usando API TikWM: ${username}`);
                        } else {
                            throw new Error('No se encontró contenido en TikWM');
                        }
                    } else {
                        throw new Error('API TikWM no respondió correctamente');
                    }
                } catch (error) {
                    console.log(`⚠️ API TikWM falló: ${error.message}, usando Xemoz...`);
                    
                    // ============ TERCERO: API XEMOZ ============
                    const apiUrl = `https://api-xemoz-official.my.id/api/donwloader/tiktok.php?url=${encodeURIComponent(url)}`;
                    const response = await axios.get(apiUrl, {
                        timeout: 30000,
                        headers: {
                            'accept': '*/*',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    if (!response.data?.status || !response.data?.result?.result) {
                        throw new Error('No se pudo obtener el contenido');
                    }
                    
                    const result = response.data.result.result;
                    username = result.username || 'Desconocido';
                    duration = result.duration || 'N/A';
                    
                    if (result.stats) {
                        views = result.stats?.views || '0';
                        likes = result.stats?.likes || '0';
                        comments = result.stats?.comments || '0';
                        shares = result.stats?.shares || '0';
                    }
                    
                    videoUrl = result.video && result.video[0] ? result.video[0] : null;
                    type = result.type || 'video';
                    author = username;
                    title = 'TikTok Video';
                    apiUsada = 'Xemoz';
                    
                    if (!videoUrl) {
                        throw new Error('No se pudo obtener el enlace del video');
                    }
                    
                    console.log(`✅ TikTok usando API Xemoz: ${username}`);
                }
            }
            
            // ============ ENVIAR CONTENIDO ============
            
            // Si hay imágenes (múltiples)
            if (mediaItems.length > 0) {
                const caption = `《✧》TikTok Downloader\n\n` +
                              `*Autor:* ${author}\n` +
                              `*Likes:* ${likes}\n` +
                              `*Vistas:* ${views}\n` +
                              `*Comentarios:* ${comments}\n` +
                              `*Compartidas:* ${shares}\n` +
                              `*Tipo:* ${mediaItems.length} imágenes`;
                
                await replyWithContext(caption);
                
                for (let i = 0; i < mediaItems.length; i++) {
                    try {
                        const imgResponse = await axios.get(mediaItems[i].url, {
                            responseType: 'arraybuffer',
                            timeout: 30000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });
                        
                        const imgBuffer = Buffer.from(imgResponse.data);
                        
                        await sock.sendMessage(from, {
                            image: imgBuffer,
                            caption: `> Imagen ${i + 1}/${mediaItems.length} - @${username}`,
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
                        
                    } catch (imgError) {
                        console.log(`⚠️ Error descargando imagen ${i + 1}: ${imgError.message}`);
                    }
                }
                
            } else if (videoUrl) {
                const videoResponse = await axios.get(videoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://www.tiktok.com/'
                    }
                });
                
                const videoBuffer = Buffer.from(videoResponse.data);
                
                const caption = `《✧》TikTok Downloader\n\n` +
                              `*Autor:* ${author}\n` +
                              `*Título:* ${title}\n` +
                              `*Likes:* ${likes}\n` +
                              `*Vistas:* ${views}\n` +
                              `*Comentarios:* ${comments}\n` +
                              `*Compartidas:* ${shares}\n` +
                              `*Duración:* ${duration}`;
                
                await replyWithContext(caption);
                
                await sock.sendMessage(from, {
                    video: videoBuffer,
                    caption: `> @${username}`,
                    mimetype: 'video/mp4',
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
                throw new Error('No se encontró contenido descargable');
            }
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`✅ TikTok descargado por ${pushName || userNumber}: ${username} - ${duration} (${apiUsada})`);
            
        } catch (error) {
            console.error('❌ Error en tt:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};