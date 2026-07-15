export default {
    name: 'inspect',
    alias: ['inspeccionar', 'inspector'],
    description: 'Obtener ID de grupo o canal por link', // <- Para.help
    category: 'Herramientas', // <- ACA ESTA

    async execute(sock, msg, options) {
        try {
            const { config, args, senderJid } = options;
            const from = msg.key.remoteJid;

            const text = args.join(' ').trim();

            if (!text) {
                return await sock.sendMessage(from, {
                    text: `🌌 Por favor, ingrese el enlace de grupo/comunidad o canal.\n\n> Ejemplo: ${config.prefix}inspect https://chat.whatsapp.com/xxxxx\n> Ejemplo: ${config.prefix}inspect https://whatsapp.com/channel/xxxxx`,
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
            }

            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);

            try {
                await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });
            } catch (e) {}

            // Extraer IDs de los enlaces
            const channelUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:channel\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];
            const inviteUrl = text?.match(/(?:https:\/\/)?(?:www\.)?(?:chat\.|wa\.)?whatsapp\.com\/(?:invite\/|joinchat\/)?([0-9A-Za-z]{22,24})/i)?.[1];

            let id = null;

            // Intentar obtener información del grupo por enlace de invitación
            if (inviteUrl) {
                try {
                    const groupInfo = await sock.groupGetInviteInfo(inviteUrl);
                    id = groupInfo.id;
                } catch (e) {
                    return await sock.sendMessage(from, {
                        text: `🌌 Grupo no encontrado. Verifique que el enlace sea correcto.`,
                        contextInfo: {
                            mentionedJid: [senderJid],
                            forwardingScore: 9999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                }
            }
            // Intentar obtener información del canal
            else if (channelUrl) {
                try {
                    const newsletterInfo = await sock.newsletterMetadata("invite", channelUrl).catch(() => null);
                    if (newsletterInfo && newsletterInfo.id) {
                        id = newsletterInfo.id;
                    } else {
                        return await sock.sendMessage(from, {
                            text: `《✧》 No se encontró información del canal. Verifique que el enlace sea correcto.`,
                            contextInfo: {
                                mentionedJid: [senderJid],
                                forwardingScore: 9999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: config.canalId || '',
                                    serverMessageId: 0,
                                    newsletterName: config.canalNombre || ''
                                }
                            }
                        }, { quoted: msg });
                    }
                } catch (e) {
                    return await sock.sendMessage(from, {
                        text: `《✧》 No se encontró información del canal. Verifique que el enlace sea correcto.`,
                        contextInfo: {
                            mentionedJid: [senderJid],
                            forwardingScore: 9999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                }
            }
            // Si no hay enlace válido
            else {
                return await sock.sendMessage(from, {
                    text: `《✧》 Enlace no válido. Por favor, ingrese un enlace de grupo o canal de WhatsApp.`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardingScore: 9999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        }
                    }
                }, { quoted: msg });
            }

            if (id) {
                await sock.sendMessage(from, {
                    text: `${id}`,
                    interactiveButtons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "Copy",
                                copy_code: id
                            })
                        }
                    ],
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardingScore: 9999,
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

                console.log(`✅ ID obtenido: ${id} por ${senderJid}`);
            }

        } catch (error) {
            console.error('❌ Error en inspect:', error);

            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}

            await sock.sendMessage(msg.key.remoteJid, {
                text: `《✧》 Error al inspeccionar: ${error.message}`,
                contextInfo: {
                    forwardingScore: 9999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: options.config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: options.config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
        }
    }
};