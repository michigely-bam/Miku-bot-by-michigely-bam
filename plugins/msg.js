import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempFolder = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

function cleanNumber(number) {
    if (!number) return '';
    let cleaned = number.split('@')[0];
    cleaned = cleaned.split(':')[0];
    return cleaned.replace(/\D/g, '');
}

export default {
    name: 'msg',
    alias: [],
    description: 'Obtiene el JSON del mensaje citado',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, userNumber, isOwner, senderJid, pushName } = options;
            const from = msg.key.remoteJid;
            
            // Verificar que sea owner
            const senderClean = cleanNumber(senderNumber || userNumber || '');
            const isUserOwner = config.owner && Array.isArray(config.owner) && config.owner.some(owner => cleanNumber(owner) === senderClean);
            
            if (!isUserOwner && !isOwner) {
                return;
            }
            
            // Obtener el mensaje citado
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo;
            const quotedMessage = quotedMsg?.quotedMessage;
            
            if (!quotedMessage) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                return;
            }
            
            // Obtener el JSON del mensaje citado
            const msgJson = JSON.stringify(quotedMessage, null, 2);
            
            // Crear archivo temporal
            const fileName = `mensaje.json`;
            const filePath = path.join(tempFolder, fileName);
            fs.writeFileSync(filePath, msgJson, 'utf8');
            
            // Enviar el archivo
            await sock.sendMessage(from, {
                document: fs.readFileSync(filePath),
                mimetype: 'application/json',
                fileName: fileName,
                caption: ``,
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
            
            // Limpiar archivo temporal
            fs.unlinkSync(filePath);
            
            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}
            
            console.log(`📄 JSON enviado por ${pushName || userNumber}`);
            
        } catch (error) {
            console.error('❌ Error en msg:', error);
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}
        }
    }
};