import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIMARIOS_FILE = path.join(__dirname, '..', 'databases', 'primarios.json');
const USERS_FILE = path.join(__dirname, '..', 'databases', 'users.json');

const cleanNumber = (num) => {
    if (!num) return '';
    return num.toString().replace(/[^0-9]/g, '');
};

const loadUsersDB = () => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        return {};
    }
};

const getRealPhoneNumber = (jid, usersDB) => {
    if (!jid) return null;
    const identificador = jid.split('@')[0];
    
    for (const [num, data] of Object.entries(usersDB)) {
        if (data.lid === jid || data.lid === identificador) return num;
        if (data.jid === jid || data.jid === identificador) return num;
    }
    
    if (/^[\d]+$/.test(identificador) && identificador.length > 8) return identificador;
    return null;
};

async function isUserAdmin(sock, groupId, userNumber, userJid, usersDB) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        
        const participant = groupMetadata.participants.find(p => {
            if (p.id === userJid) return true;
            if (p.id.includes(userNumber || '')) return true;
            if (userJid && userJid.includes('@lid')) {
                const userNum = userJid.split('@')[0];
                if (p.id.includes(userNum)) return true;
            }
            const realNumber = getRealPhoneNumber(p.id, usersDB);
            if (realNumber === userNumber) return true;
            return false;
        });
        
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch {
        return false;
    }
}

export default {
    name: 'delprimary',
    alias: ['eliminarprimario', 'removeprimary'],
 category: 'admin',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            if (!from.endsWith('@g.us')) {
                return await sock.sendMessage(from, {
                    text: `🌺 Este comando solo puede usarse en grupos`,
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
            
            const usersDB = loadUsersDB();
            
            // Verificar si es admin
            const isAdmin = await isUserAdmin(sock, from, senderNumber, senderJid, usersDB);
            
            // Verificar si es owner
            const isOwner = config.owner && config.owner.some(ownerNum => 
                cleanNumber(ownerNum) === cleanNumber(senderNumber)
            );
            
            if (!isAdmin && !isOwner) {
                return await sock.sendMessage(from, {
                    text: `🌺 Debes ser administrador para usar este comando`,
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
            
            // Cargar base de datos
            let primariosDB = {};
            if (fs.existsSync(PRIMARIOS_FILE)) {
                const data = fs.readFileSync(PRIMARIOS_FILE, 'utf8');
                primariosDB = JSON.parse(data);
            }
            
            if (!primariosDB[from]) {
                return await sock.sendMessage(from, {
                    text: `🌺 No hay un bot primario establecido en este grupo`,
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
            
            const botEliminado = primariosDB[from].botNombre || primariosDB[from].botPhone;
            
            delete primariosDB[from];
            fs.writeFileSync(PRIMARIOS_FILE, JSON.stringify(primariosDB, null, 2), 'utf8');
            
            await sock.sendMessage(from, {
                text: `🌠 Se ha eliminado el bot primario *${botEliminado}* del grupo`,
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

        } catch (error) {
            console.error('Error en delprimary:', error);
        }
    }
};