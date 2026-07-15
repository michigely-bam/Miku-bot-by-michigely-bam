import fs from 'fs';
import path from 'path';

// ID del grupo donde se enviarán los reportes
const REPORT_GROUP_ID = "120363406310003071@g.us";

export default {
    name: 'report',
    alias: ['reporte'],
 category: 'Main',
    
    async execute(sock, msg, options) {
        try {
            const { config, sender, pushName, args } = options;
            const from = msg.key.remoteJid;
            
            // Verificar si se proporcionó texto
            const texto = args.join(' ').trim();
            
            if (!texto) {
                await sock.sendMessage(from, {
                    text: `🦋 Debes proporcionar un texto para enviar cómo reporte`,
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
            
            // Obtener información del grupo de origen (si es un grupo)
            let groupName = "Chat privado";
            let groupId = from;
            
            if (from.endsWith('@g.us')) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    groupName = groupMetadata.subject || "Grupo sin nombre";
                    groupId = from;
                } catch (error) {
                    console.error('Error obteniendo metadata del grupo:', error);
                    groupName = "Grupo desconocido";
                }
            }
            
            // Obtener el lid del usuario (número sin @)
            const userLid = sender.split('@')[0].split(':')[0];
            
            // Buscar el bot principal para enviar el reporte
            if (global.principalBot && global.principalBot.user) {
                // Enviar usando el bot principal
                await sendReport(global.principalBot, config, sender, pushName, userLid, groupName, groupId, texto);
            } else {
                // Si no hay bot principal, enviar desde el bot actual
                console.log('[REPORT] No se encontró bot principal, enviando desde el actual');
                await sendReport(sock, config, sender, pushName, userLid, groupName, groupId, texto);
            }
            
            // Responder al usuario confirmando (SIEMPRE desde el bot actual)
            await sock.sendMessage(from, {
                text: `🌺 Tu Reporte fue enviado.\n> Gracias por reportar ฅ⁠^⁠•⁠ﻌ⁠•⁠^⁠ฅ`,
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
            
        } catch (error) {
            console.error('Error en report:', error);
            
            await sock.sendMessage(msg.key.remoteJid, {
                text: `🌹 Error al enviar reporte: ${error.message}`,
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

// Función para enviar el reporte
async function sendReport(botSocket, config, sender, pushName, userLid, groupName, groupId, texto) {
    try {
        // Construir el mensaje de reporte
        const reportText = 
`ᨙᨐ͜᷍ᨏㅤreport ⪨꯭⪨

ᣟ🌠᪲ᤢᣟ Nombre » *${pushName || 'Usuario sin nombre'}*
ᣟ🌠᪲ᤢᣟ Tag » @${sender.split('@')[0]}
ᣟ🌠᪲ᤢᣟ lid » *${userLid}*
ᣟ🌠᪲ᤢᣟ Grupo » *${groupName}*
ᣟ🌠᪲ᤢᣟ Id » *${groupId}*
ᣟ🌠᪲ᤢᣟ Reporte » *${texto}*`;

        // Buscar el banner
        const bannerPath = path.join(process.cwd(), 'img', 'banner.jpg');
        let bannerBuffer = null;
        
        try {
            if (fs.existsSync(bannerPath)) {
                bannerBuffer = fs.readFileSync(bannerPath);
                console.log('✅ Banner cargado para report');
            }
        } catch (error) {
            console.log('⚠️ No se pudo cargar el banner:', error.message);
        }

        // Preparar el mensaje
        const messageData = {
            text: reportText,
            mentions: [sender],
            contextInfo: {
                mentionedJid: [sender],
                forwardingScore: 9999999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: config.canalId || '',
                    serverMessageId: 0,
                    newsletterName: config.canalNombre || ''
                }
            }
        };

        // Añadir banner si existe
        if (bannerBuffer) {
            messageData.contextInfo.externalAdReply = {
                title: `🌠 NUEVO REPORTE 🌠`,
                body: `De: ${pushName || 'Usuario'}`,
                thumbnail: bannerBuffer,
                mediaType: 1,
                showAdAttribution: false,
                renderLargerThumbnail: true
            };
        }

        // Enviar al grupo de reportes
        await botSocket.sendMessage(REPORT_GROUP_ID, messageData);
        
        console.log(`📝 Reporte enviado al grupo ${REPORT_GROUP_ID} desde ${pushName || sender}`);
        
    } catch (error) {
        console.error('Error enviando reporte al grupo:', error);
        throw error;
    }
}
