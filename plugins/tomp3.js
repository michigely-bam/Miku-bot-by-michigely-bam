import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

// Función para crear un nombre de archivo temporal único
const getTempFilePath = (extension) => {
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    return path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`);
};

// Función para convertir video a audio usando ffmpeg
async function convertVideoToAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${inputPath}" -q:a 0 -map a "${outputPath}" -y`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('Error en ffmpeg:', stderr);
                reject(error);
            } else {
                resolve(true);
            }
        });
    });
}

// Función para limpiar archivos temporales
function cleanupFiles(...files) {
    for (const file of files) {
        if (file && fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
                console.log(`🗑️ Archivo temporal eliminado: ${path.basename(file)}`);
            } catch (error) {
                console.error(`Error eliminando archivo:`, error.message);
            }
        }
    }
}

export default {
    name: 'tomp3',
    alias: ['toaudio'],
 category: 'Herramientas',
    
    async execute(sock, msg, options) {
        const { config } = options;
        const from = msg.key.remoteJid;
        
        let inputPath = null;
        let outputPath = null;
        
        try {
            console.log(`🎵 Comando tomp3 ejecutado por: ${options.senderNumber}`);

            // Verificar si es respuesta a un mensaje
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            
            if (!quotedMsg?.quotedMessage) {
                await sock.sendMessage(from, {
                    text: `🦋 Debes responder a un video`,
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

            const quotedMessage = quotedMsg.quotedMessage;
            const videoMessage = quotedMessage.videoMessage;
            
            // Verificar si el mensaje citado es un video
            if (!videoMessage) {
                await sock.sendMessage(from, {
                    text: `🦋 Debes responder a un video`,
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

            // Reacción de carga
            try {
                await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } });
            } catch (e) {}

            // Enviar mensaje de procesamiento
            await sock.sendMessage(from, {
                text: `🦋 Procesando video...\n> Esto puede demorar unos segundos.`,
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

            // Descargar el video usando la estructura correcta
            const quotedMsgObj = {
                key: {
                    remoteJid: from,
                    id: quotedMsg.stanzaId,
                    participant: quotedMsg.participant || from,
                    fromMe: false
                },
                message: {
                    videoMessage: videoMessage
                }
            };
            
            console.log('📥 Descargando video...');
            const mediaBuffer = await downloadMediaMessage(
                quotedMsgObj,
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );

            if (!mediaBuffer || mediaBuffer.length === 0) {
                throw new Error('No se pudo descargar el video');
            }
            
            // Verificar tamaño (máx 50MB para evitar problemas)
            const maxSize = 50 * 1024 * 1024;
            if (mediaBuffer.length > maxSize) {
                throw new Error(`Video demasiado grande (${(mediaBuffer.length / 1024 / 1024).toFixed(2)}MB)\n> Máx: 50MB`);
            }

            // Guardar video temporalmente
            inputPath = getTempFilePath('mp4');
            fs.writeFileSync(inputPath, mediaBuffer);
            console.log(`💾 Video guardado: ${path.basename(inputPath)} (${(mediaBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

            // Crear ruta para el audio de salida
            outputPath = getTempFilePath('mp3');
            console.log(`🎵 Convirtiendo a audio...`);

            // Convertir video a audio con timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout de conversión (60s)')), 60000);
            });
            
            await Promise.race([convertVideoToAudio(inputPath, outputPath), timeoutPromise]);

            if (!fs.existsSync(outputPath)) {
                throw new Error('Error al convertir el video a audio');
            }

            // Leer el audio convertido
            const audioBuffer = fs.readFileSync(outputPath);
            
            // Obtener información del video original
            const duration = videoMessage.seconds || 0;
            const minutos = Math.floor(duration / 60);
            const segundos = Math.floor(duration % 60);
            const duracionTexto = minutos > 0 ? `${minutos}:${segundos.toString().padStart(2, '0')}` : `${segundos} segundos`;

            // Reacción de éxito parcial
            try {
                await sock.sendMessage(from, { react: { text: '📤', key: msg.key } });
            } catch (e) {}

            // Enviar el audio
            console.log('📤 Enviando audio...');
            await sock.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `audio_${Date.now()}.mp3`,
                ptt: false,
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

            // Mensaje de éxito
            await sock.sendMessage(from, {
                text: `✅ *Audio extraído con éxito*\n\n📁 *Formato:* MP3\n⏱️ *Duración:* ${duracionTexto}\n📏 *Tamaño:* ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`,
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

            // Reacción final
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}

            console.log(`✅ Audio enviado (${duracionTexto}, ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB)`);

        } catch (error) {
            console.error('❌ Error en tomp3:', error);
            
            // Reacción de error
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `🦋 *Error:* ${error.message}`,
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
            } catch (e) {}
            
        } finally {
            // Limpiar archivos temporales
            cleanupFiles(inputPath, outputPath);
        }
    }
};