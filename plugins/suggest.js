export default {
    name: 'suggest',
    alias: ['sugerencia', 'reportar'],
    description: 'Envía una sugerencia al grupo oficial del bot',
    category: 'main',
    
    async execute(sock, msg, options) {
        try {
            const { args, config, pushName, userNumber, replyWithContext, isGroup, senderJid } = options;
            const from = msg.key.remoteJid;
            const suggestion = args.join(' ').trim();
            
            if (!suggestion) {
                return await replyWithContext(`🌌 Debes escribir una sugerencia\n> Ejemplo: ${config.prefix}suggest Me gustaría que agreguen un comando de...`);
            }
            
            const TARGET_GROUP = '120363407835993121@g.us';
            
            let groupName = 'Chat privado';
            let groupId = from;
            
            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    groupName = groupMetadata.subject || 'Sin nombre';
                } catch (e) {}
            }
            
            const fecha = new Date();
            const fechaFormateada = fecha.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const senderNumber = userNumber || (senderJid ? senderJid.split('@')[0] : 'Desconocido');
            const senderName = pushName || 'Usuario';
            
            const suggestionMessage = `🌌 *Sugerencia:* ${suggestion}
𖥔᳝݁݁🌌𖥔ׅ݁݁ *Enviado por:* ${senderName}
𖥔᳝݁݁🌌𖥔ׅ݁݁ *Número:* ${senderNumber}
𖥔᳝݁݁🌌𖥔ׅ݁݁ *Tag:* @${senderNumber}
𖥔᳝݁݁🌌𖥔ׅ݁݁ *Grupo:* ${groupName}
𖥔᳝݁݁🌌𖥔ׅ݁݁ *Grupo Id:* ${groupId}
𖥔᳝݁݁🌌𖥔ׅ݁݁ *Fecha:* ${fechaFormateada}`;
            
            // Intentar enviar con el bot principal
            let enviado = false;
            
            if (global.principalBot && global.principalBot.sendMessage) {
                try {
                    await global.principalBot.sendMessage(TARGET_GROUP, {
                        text: suggestionMessage,
                        mentions: [`${senderNumber}@s.whatsapp.net`],
                        contextInfo: {
                            mentionedJid: [`${senderNumber}@s.whatsapp.net`],
                            forwardingScore: 9999999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    });
                    enviado = true;
                    console.log(`✅ Sugerencia enviada por bot principal a ${TARGET_GROUP}`);
                } catch (err) {
                    console.log('Error con bot principal:', err.message);
                }
            }
            
            // Si no se pudo con el principal, usar el bot actual
            if (!enviado) {
                try {
                    await sock.sendMessage(TARGET_GROUP, {
                        text: suggestionMessage,
                        mentions: [`${senderNumber}@s.whatsapp.net`],
                        contextInfo: {
                            mentionedJid: [`${senderNumber}@s.whatsapp.net`],
                            forwardingScore: 9999999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    });
                    enviado = true;
                    console.log(`✅ Sugerencia enviada por bot actual a ${TARGET_GROUP}`);
                } catch (err) {
                    console.log('Error con bot actual:', err.message);
                }
            }
            
            if (enviado) {
                await replyWithContext(`🌌 Tu sugerencia se ha enviado con éxito.\n> la sugerencia puede tomar tiempo en ser respondida`);
            } else {
                await replyWithContext(`❌ No se pudo enviar tu sugerencia. Asegúrate de que el bot esté en el grupo de sugerencias.`);
            }
            
        } catch (error) {
            console.error('❌ Error en suggest:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};