export default {
    name: 'listadmin',
    alias: ['admins', 'administradores'],
 category: 'Grupo',
    
    async execute(sock, msg, options) {
        try {
            const { config, usersDB, senderNumber, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            // Solo funciona en grupos
            if (!from.includes('@g.us')) {
                await sock.sendMessage(from, {
                    text: `🌠 Este comando solo funciona en grupos.`,
                    contextInfo: {
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

            // Mostrar que está procesando
            await sock.sendPresenceUpdate('composing', from);
            
            // Obtener información del grupo
            const groupMetadata = await sock.groupMetadata(from);
            
            // Verificar si el usuario que ejecuta el comando es administrador
            const userParticipant = groupMetadata.participants.find(p => {
                if (p.id === senderJid) return true;
                if (p.id.includes(senderNumber || '')) return true;
                if (senderJid && senderJid.includes('@lid')) {
                    const senderNum = senderJid.split('@')[0];
                    if (p.id.includes(senderNum)) return true;
                }
                return false;
            });
            
            const isUserAdmin = userParticipant && (userParticipant.admin === 'admin' || userParticipant.admin === 'superadmin');
            
            // Verificar si es owner del bot
            const isOwner = config.owner && config.owner.some(ownerNum => 
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );
            
            if (!isUserAdmin && !isOwner) {
                await sock.sendMessage(from, {
                    text: `🌹 Solo administradores del grupo pueden usar este comando.`,
                    contextInfo: {
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
            
            // Filtrar solo administradores
            const admins = groupMetadata.participants.filter(p => 
                p.admin === 'admin' || p.admin === 'superadmin'
            );
            
            if (admins.length === 0) {
                await sock.sendMessage(from, {
                    text: `🎀 No se encontraron administradores en este grupo.`,
                    contextInfo: {
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
            
            // 🔥 FUNCIÓN PARA OBTENER NÚMERO REAL 🔥
            const getRealPhoneNumber = (jid) => {
                if (!jid) return null;
                const identificador = jid.split('@')[0];
                
                for (const [num, data] of Object.entries(usersDB)) {
                    if (data.lid === jid || data.lid === identificador) return num;
                    if (data.jid === jid || data.jid === identificador) return num;
                }
                
                if (/^[\d]+$/.test(identificador) && identificador.length > 8) return identificador;
                return null;
            };
            
            // Construir el mensaje
            let adminList = `♡ 𝙇𝙞𝙨𝙩𝙖 𝙙𝙚 𝘼𝙙𝙢𝙞𝙣𝙞𝙨𝙩𝙧𝙖𝙙𝙤𝙧𝙚𝙨\n\n`;
            
            // Preparar menciones
            const mentions = [];
            
            for (const admin of admins) {
                const adminJid = admin.id;
                const adminNumber = getRealPhoneNumber(adminJid) || adminJid.split('@')[0];
                
                // Obtener nombre del registro del bot
                const adminRegistro = usersDB[adminNumber];
                
                const adminNombre = adminRegistro ? (adminRegistro.pushName || adminRegistro.name) : `Usuario ${adminNumber}`;
                const adminRol = admin.admin === 'superadmin' ? '👑 SUPER ADMIN' : '⭐ ADMIN';
                
                adminList += `> [${adminRol}]\n`;
                adminList += `> ✿ Nombre » ${adminNombre}\n`;
                adminList += `> ✿ Tag » @${adminNumber}\n`;
                adminList += `> ✿ ID » ${adminNumber}\n\n`;
                
                mentions.push(adminJid);
            }
            
            // Enviar el mensaje
            await sock.sendMessage(from, {
                text: adminList,
                mentions: mentions,
                contextInfo: {
                    mentionedJid: mentions,
                    forwardingScore: 9999999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: config.canalId || '',
                        serverMessageId: 0,
                        newsletterName: config.canalNombre || ''
                    }
                }
            }, { quoted: msg });
            
            console.log(`✅ Lista de ${admins.length} administradores enviada a ${from} por ${pushName || senderNumber}`);
            
        } catch (error) {
            console.error(`❌ Error en listadmin:`, error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `🏮 Ocurrió un error: ${error.message}`,
                    contextInfo: {
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: options.config.canalId || '',
                            serverMessageId: 0,
                            newsletterName: options.config.canalNombre || ''
                        },
                        forwardingScore: 9999999,
                        isForwarded: true
                    }
                }, { quoted: msg });
            } catch (e) {
                console.error('Error enviando mensaje de error:', e);
            }
        }
    }
};