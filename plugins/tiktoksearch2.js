import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export default {
    name: 'tiktoksearch2',
    alias: ['ttsearch2'],
 category: 'search',
    
    async execute(sock, msg, options) {
        const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
        const from = msg.key.remoteJid;
        
        try {
            // Verificar registro
            if (usersDB && senderNumber && !usersDB[senderNumber]) {
                const reply = 'ৎ꯭᪲୨֟ Para usar mis comandos tienes que estar registrado.\n> Uso : ' + config.prefix + 'reg Misa.16';
                return await sock.sendMessage(from, { 
                    text: reply,
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

            // Verificar si se proporcionó búsqueda
            if (!args || args.length === 0) {
                const reply = "ৎ꯭᪲୨֟ Debes proporcionar una búsqueda\n> Ejemplo: " + config.prefix + "tiktoksearch2 kpop";
                return await sock.sendMessage(from, { 
                    text: reply,
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

            const query = args.join(" ");
            
            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);
            
            try {
                await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
            } catch (e) {}
            
            await sock.sendMessage(from, { 
                text: "ৎ꯭᪲୨֟ Buscando y descargando 5 videos aleatorios...\n> Esto puede tomar unos momentos",
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

            // BUSCAR en TikTok
            const search = await axios({
                method: "POST",
                url: "https://tikwm.com/api/feed/search",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Cookie": "current_language=en",
                },
                data: { keywords: query, count: 30, cursor: 0, HD: 1 },
                timeout: 30000
            });

            const results = search.data?.data?.videos || [];

            if (!results.length) {
                const reply = "🍡 No se encontraron videos.";
                await sock.sendMessage(from, { 
                    text: reply,
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
                return;
            }

            // Mezclar array para obtener videos aleatorios
            const shuffled = [...results].sort(() => 0.5 - Math.random());
            const selectedVideos = shuffled.slice(0, Math.min(5, shuffled.length));

            const tempDir = path.join(__dirname, '..', 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            // Descargar y convertir cada video
            const videoItems = [];
            let sentCount = 0;
            let failedCount = 0;

            for (let i = 0; i < selectedVideos.length; i++) {
                try {
                    const video = selectedVideos[i];
                    const videoUrl = video.play || video.wmplay || video.hdplay;
                    
                    if (!videoUrl) {
                        failedCount++;
                        continue;
                    }

                    console.log(`📥 Descargando video ${i + 1}/${selectedVideos.length}...`);

                    // Descargar video
                    const tempFile = path.join(tempDir, `tt_${Date.now()}_${i}.mp4`);
                    const convertedFile = path.join(tempDir, `tt_conv_${Date.now()}_${i}.mp4`);
                    
                    // Descargar con stream
                    const writer = fs.createWriteStream(tempFile);
                    const videoResponse = await axios({
                        method: 'get',
                        url: videoUrl,
                        responseType: 'stream',
                        timeout: 60000,
                        maxRedirects: 5,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    videoResponse.data.pipe(writer);
                    
                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                    
                    const stats = fs.statSync(tempFile);
                    console.log(`✅ Video descargado: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
                    
                    // Convertir video a formato compatible
                    console.log(`🔄 Convirtiendo video ${i + 1}...`);
                    
                    try {
                        const ffmpegCmd = `ffmpeg -i "${tempFile}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 128k -movflags +faststart -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -pix_fmt yuv420p -r 30 "${convertedFile}" -y`;
                        await execAsync(ffmpegCmd);
                        
                        const convertedStats = fs.statSync(convertedFile);
                        console.log(`✅ Video convertido: ${(convertedStats.size / 1024 / 1024).toFixed(2)} MB`);
                        
                        let videoBuffer = fs.readFileSync(convertedFile);
                        
                        // Si es muy grande, comprimir más
                        if (convertedStats.size > 16 * 1024 * 1024) {
                            console.log(`⚠️ Video muy grande, comprimiendo más...`);
                            const compressedFile = path.join(tempDir, `tt_comp_${Date.now()}_${i}.mp4`);
                            await execAsync(`ffmpeg -i "${convertedFile}" -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 96k -movflags +faststart -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -pix_fmt yuv420p -r 25 "${compressedFile}" -y`);
                            videoBuffer = fs.readFileSync(compressedFile);
                            fs.unlinkSync(compressedFile);
                            console.log(`✅ Video comprimido: ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
                        }
                        
                        const caption = `🌹 *Video ${i + 1}/${selectedVideos.length}*\n` +
                                      `🌹 *Autor:* ${video.author.nickname} (@${video.author.unique_id})\n` +
                                      `🌹 *Likes:* ${video.digg_count.toLocaleString()}\n` +
                                      `🌹 *Comentarios:* ${video.comment_count.toLocaleString()}\n` +
                                      `🌹 *Compartidos:* ${video.share_count.toLocaleString()}\n` +
                                      `🌹 *Título:* ${video.title?.substring(0, 50)}${video.title?.length > 50 ? '...' : ''}`;
                        
                        videoItems.push({
                            video: videoBuffer,
                            caption: caption,
                            mimetype: 'video/mp4'
                        });
                        
                        sentCount++;
                        
                        // Limpiar archivos
                        fs.unlinkSync(tempFile);
                        fs.unlinkSync(convertedFile);
                        
                    } catch (ffmpegError) {
                        console.error(`Error en conversión video ${i + 1}:`, ffmpegError.message);
                        // Si falla conversión, usar original
                        const videoBuffer = fs.readFileSync(tempFile);
                        const caption = `🌹 *Video ${i + 1}/${selectedVideos.length}*\n` +
                                      `🌹 *Autor:* ${video.author.nickname} (@${video.author.unique_id})\n` +
                                      `🌹 *Likes:* ${video.digg_count.toLocaleString()}\n` +
                                      `🌹 *Comentarios:* ${video.comment_count.toLocaleString()}\n` +
                                      `🌹 *Compartidos:* ${video.share_count.toLocaleString()}\n` +
                                      `🌹 *Título:* ${video.title?.substring(0, 50)}${video.title?.length > 50 ? '...' : ''}\n⚠️ Video en formato original`;
                        
                        videoItems.push({
                            video: videoBuffer,
                            caption: caption,
                            mimetype: 'video/mp4'
                        });
                        
                        sentCount++;
                        fs.unlinkSync(tempFile);
                    }
                    
                    // Pequeña pausa entre descargas
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (videoError) {
                    console.error(`❌ Error procesando video ${i + 1}:`, videoError);
                    failedCount++;
                }
            }

            // Enviar todos los videos como carrusel (album)
            if (videoItems.length > 0) {
                console.log(`📤 Enviando ${videoItems.length} videos como carrusel...`);
                
                const albumItems = videoItems.map(item => ({
                    video: item.video,
                    caption: item.caption,
                    mimetype: 'video/mp4'
                }));
                
                await sock.sendMessage(from, {
                    album: albumItems,
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
                
                try {
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                } catch (e) {}
                
                console.log(`✅ Carrusel enviado: ${sentCount} videos de "${query}" por ${pushName || senderNumber}`);
            } else {
                await sock.sendMessage(from, { 
                    text: "🍡 No se pudieron descargar los videos. Intenta con otra búsqueda.",
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

        } catch (error) {
            console.error("❌ Error en tiktoksearch2:", error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                const reply = "🥕 Ocurrió un error en la búsqueda.\n> Error: " + error.message;
                await sock.sendMessage(from, { 
                    text: reply,
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
            } catch (e) {
                console.error('Error enviando mensaje de error:', e);
            }
        } finally {
            // Limpiar archivos temporales que pudieron quedar
            try {
                const tempDir = path.join(__dirname, '..', 'temp');
                if (fs.existsSync(tempDir)) {
                    const files = fs.readdirSync(tempDir);
                    for (const file of files) {
                        if (file.startsWith('tt_')) {
                            fs.unlinkSync(path.join(tempDir, file));
                        }
                    }
                }
            } catch (cleanError) {
                console.error('Error limpiando archivos temporales:', cleanError);
            }
        }
    }
};