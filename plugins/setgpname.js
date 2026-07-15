export default {
    name: 'setgpname',
    alias: ['setnombre', 'cambiarnombre'],
 category: 'Grupo',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, args } = options;
            const from = msg.key.remoteJid;
            
            if (!from.endsWith('@g.us')) {
                return;
            }
            
            let groupMetadata;
            try {
                groupMetadata = await sock.groupMetadata(from);
            } catch (error) {
                return;
            }
            
            // Verificar si el usuario es admin del grupo
            const isGroupAdmin = groupMetadata.participants.find(p => {
                if (p.id === senderJid) return true;
                if (p.id.includes(senderNumber || '')) return true;
                if (senderJid && senderJid.includes('@lid')) {
                    const senderNum = senderJid.split('@')[0];
                    if (p.id.includes(senderNum)) return true;
                }
                return false;
            })?.admin;
            
            // Verificar si es owner del bot
            const isOwner = config.owner && config.owner.some(ownerNum => 
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );
            
            // Verificar si tiene rango en el bot
            const userData = usersDB[senderNumber];
            const userRank = userData?.rank;
            const hasBotRank = isOwner || (userRank && ['owner', 'c-owner', 'srmod', 'mod'].includes(userRank));
            
            if (!isGroupAdmin && !hasBotRank) {
                await sock.sendMessage(from, {
                    text: `🍁 Solo administradores del grupo pueden usar este comando.`,
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
            
            const text = args.join(' ').trim();
            if (!text) {
                await sock.sendMessage(from, {
                    text: `🌠 Debes proporcionar un texto para cambiar el nombre del grupo.\n> Ejemplo: ${config.prefix}setgpname Nuevo Nombre`,
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
            
            try {
                await sock.groupUpdateSubject(from, text);
                
                await sock.sendMessage(from, {
                    text: `🍁 *Nombre del grupo cambiado a:* ${text}`,
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
                
                console.log(`\x1b[1;32m✅ Nombre del grupo cambiado a "${text}" por ${senderNumber}\x1b[0m`);
                
            } catch (error) {
                console.log(`\x1b[1;31m❌ Error en setgpname: ${error.message}\x1b[0m`);
                
                if (error.message.includes('not authorized') || 
                    error.message.includes('forbidden') || 
                    error.message.includes('admin') ||
                    error.message.includes('insufficient')) {
                    
                    await sock.sendMessage(from, {
                        text: `🍁 *${config.name}* debe ser administrador del grupo para cambiar el nombre del grupo.`,
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
                    await sock.sendMessage(from, {
                        text: `🌠 *${config.name}* debe ser administrador del grupo para cambiar el nombre del grupo.`,
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
            }
            
        } catch (error) {
            console.error('❌ Error en setgpname:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Error al cambiar nombre: ${error.message}`,
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
        }
    }
};