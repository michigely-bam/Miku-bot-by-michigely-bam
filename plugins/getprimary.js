import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PRIMARIOS_FILE = path.join(__dirname, '..', 'databases', 'primarios.json');

export default {
    name: 'getprimary',
    alias: ['botprimario', 'verprimario'],
 category: 'admin',
    
    async execute(sock, msg, options) {
        try {
            const { config } = options;
            const from = msg.key.remoteJid;
            
            if (!from.endsWith('@g.us')) {
                return await sock.sendMessage(from, {
                    text: `🌠 Este comando solo puede usarse en grupos`,
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
            
            // Cargar base de datos
            let primariosDB = {};
            if (fs.existsSync(PRIMARIOS_FILE)) {
                const data = fs.readFileSync(PRIMARIOS_FILE, 'utf8');
                primariosDB = JSON.parse(data);
            }
            
            if (!primariosDB[from]) {
                return await sock.sendMessage(from, {
                    text: `🌠 No hay un bot primario establecido en este grupo`,
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
            
            const data = primariosDB[from];
            
            const mensaje = `🌠 *Bot Primario del Grupo*

🎑 Número: *${data.botPhone}*
🎑 Nombre: *${data.botNombre || 'Desconocido'}*
🎑 Tipo: *${data.botType === 'main' ? 'Main Bot' : data.botType === 'sub' ? 'Sub Bot' : 'Bot Principal'}*
🎑 Establecido por: *${data.setByPushName}*
🎑 Fecha: *${data.setAt}*`;

            await sock.sendMessage(from, {
                text: mensaje,
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
            console.error('Error en getprimary:', error);
        }
    }
};