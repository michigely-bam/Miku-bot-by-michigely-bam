import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { downloadMediaMessage } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    name: 'setpfp',
    alias: [],
    description: 'Cambia la foto de perfil del bot (solo dueño del bot)',
    category: 'sub-bot',
    
    async execute(sock, msg, options) {
        try {
            const { config, senderNumber, replyWithContext, isSubBot, userNumber, senderJid } = options;
            const from = msg.key.remoteJid;
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            
            // Limpiar números
            let userNumberClean = (senderNumber || userNumber || '').toString().replace(/\D/g, '');
            let botownerClean = config.botowner ? config.botowner.toString().replace(/\D/g, '') : '';
            
            // Verificar si es botowner
            if (!botownerClean || userNumberClean !== botownerClean) {
                return await replyWithContext(`🌌 *Solo el dueño de este bot puede cambiar su foto de perfil*`);
            }
            
            if (!quotedMsg) {
                return await replyWithContext(`🌌 Debes responder a una imagen`);
            }
            
            const messageType = Object.keys(quotedMsg)[0];
            if (messageType !== 'imageMessage') {
                return await replyWithContext(`🌌 Debes responder a una imagen\n> El mensaje citado no es una imagen.`);
            }
            
            // Construir objeto para descargar
            const quotedMsgObj = {
                key: {
                    remoteJid: from,
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant || senderJid,
                    fromMe: false
                },
                message: {
                    imageMessage: quotedMsg.imageMessage
                }
            };
            
            const buffer = await downloadMediaMessage(
                quotedMsgObj,
                'buffer',
                {},
                {
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage
                }
            );
            
            if (!buffer || buffer.length === 0) {
                throw new Error('No se pudo descargar la imagen');
            }
            
            // Actualizar foto de perfil
            await sock.updateProfilePicture(sock.user.id, buffer);
            
            await replyWithContext(`🌌 Foto de perfil cambiada con éxito`);
            
        } catch (error) {
            console.error('Error en setpfp:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`🌌 *Error:* ${error.message}`);
            } catch (e) {}
        }
    }
};