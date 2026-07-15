export default {
    name: 'update',
    alias: [],
    category: 'Owner', // <- AQUI
    description: 'Envía un aviso al canal oficial del bot', // <- AQUI
    usage: '<texto>', // <- AQUI

    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName, args } = options;
            const from = msg.key.remoteJid;

            // Verificar registro
            if (usersDB && senderNumber &&!usersDB[senderNumber]) {
                await sock.sendMessage(from, {
                    text: `🍒 Para usar mis comandos tienes que estar registrado.\n> Uso : ${config.prefix}reg Misa.16`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);

            // Verificar si el usuario es el owner (desde config.js)
            const isOwner = config.owner && config.owner.some(ownerNum =>
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );

            if (!isOwner) {
                // Responder como si el comando no existiera
                await sock.sendMessage(from, {
                    text: `๑ֵ݊🍀 ᥱᥣ ᥴ᥆mᥲᥒძ᥆ \`${config.prefix}update\` ᥒ᥆ ᥱ᥊іs𝗍ᥱ.\n> ೯۪🎑̶ֵ ᥙsᥲ ${config.prefix}help ⍴ᥲrᥲ ᥎ᥱr mіs ᥴ᥆mᥲᥒძ᥆s`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            // Verificar que se proporcionó texto
            if (!args || args.length === 0) {
                await sock.sendMessage(from, {
                    text: `🌬️ Debes proporcionar un texto para enviar de aviso.\n\nEjemplo: ${config.prefix}update Nuevo comando disponible!`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            const texto = args.join(' ');

            // Verificar que existe el canal en config
            if (!config.canalId) {
                await sock.sendMessage(from, {
                    text: `🌠 No hay un canal configurado en config.js.\n> Agrega "canalId" a tu configuración.`,
                    contextInfo: {
                        mentionedJid: [senderJid],
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
                return;
            }

            try {
                // Canal de destino (usar el canalId de config)
                const canalJid = config.canalId;

                // Enviar solo el texto proporcionado al canal
                await sock.sendMessage(canalJid, {
                    text: texto,
                    contextInfo: {
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                });

                // Confirmar al usuario
                await sock.sendMessage(from, {
                    text: `🌠 Actualización enviada correctamente al canal.\n\n> Contenido: ${texto.substring(0, 50)}${texto.length > 50? '...' : ''}`,
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

                console.log(`📢 Actualización enviada por OWNER ${pushName || senderNumber}: ${texto}`);

            } catch (error) {
                console.error('❌ Error en comando update:', error);

                await sock.sendMessage(from, {
                    text: `🌠 Error al enviar la actualización: ${error.message}`,
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

        } catch (error) {
            console.error('❌ Error en update:', error);

            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Error al procesar el comando: ${error.message}`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: options.config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: options.config.canalNombre || ''
                        },
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            } catch (e) {}
        }
    }
};