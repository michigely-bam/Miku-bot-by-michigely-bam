import fs from 'fs';
import path from 'path';

export default {
  name: 'join',
  alias: ['unir', 'entrar'],
  category: 'subbot', // <- AGREGADO AQUÍ
  description: 'Unir el bot a un grupo con enlace',

  async execute(sock, msg, options) {
    try {
      const { config, senderJid, args, replyWithContext } = options; // <- cambie senderNumber
      const from = msg.key.remoteJid;
      const senderNumber = senderJid.split('@')[0]; // <- FIX para que no falle

      // ==========================================
      // OBTENER NÚMERO DEL BOT
      // ==========================================
      let botNumber = '';
      if (sock.phoneNumber) {
        botNumber = sock.phoneNumber.replace(/[^0-9]/g, '');
      } else if (sock.user?.id) {
        botNumber = sock.user.id.split(':')[0].replace(/[^0-9]/g, '');
      }

      // ==========================================
      // VERIFICAR SI EL USUARIO ES EL BOTOWNER
      // ==========================================
      const isBotOwner = config.botowner &&
                        config.botowner.replace(/\D/g, '') === senderNumber.replace(/\D/g, '');

      if (!isBotOwner) {
        return await replyWithContext('❀ *Solo el dueño del bot puede usar este comando*', [senderJid]);
      }

      if (!args[0]) {
        return await replyWithContext(`《✧》 *Ingresa el enlace del grupo*\n\nEjemplo: *${config.prefix}join https://chat.whatsapp.com/...*`, [senderJid]);
      }

      const linkRegex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i;
      const match = args[0].match(linkRegex);
      if (!match ||!match[1]) {
        return await replyWithContext('《✧》 *El enlace ingresado no es válido*\n\nAsegúrate de usar un enlace de grupo de whatsapp completo.', [senderJid]);
      }

      try {
        const inviteCode = match[1];

        let botName = config.name || 'Bot';
        if (sock.user?.name) {
          botName = sock.user.name;
        } else if (sock.userId) {
          const cleanId = sock.userId.split('@')[0];
          botName = cleanId.split(':')[0];
        }

        await replyWithContext(`《✧》 *Intentando unir ${botName} al grupo...*`, [senderJid]);

        await sock.groupAcceptInvite(inviteCode);

        await sock.sendMessage(from, {
          text: `❀ *${botName}* se ha unido exitosamente al grupo.\n> Solicitado por el dueño del bot`
        });

        console.log(`[JOIN] Bot ${botName} se unió a grupo usando código: ${inviteCode} por su dueño`);
      } catch (error) {
        console.error('[JOIN] Error:', error);
        const errMsg = String(error.message || error);
        let responseMsg = '《✧》 *No se pudo unir al grupo*';

        if (errMsg.includes('not-authorized') || errMsg.includes('requires-admin')) {
          responseMsg = '《✧》 *La unión requiere aprobación de admin*\n\nEspera a que un administrador acepte la solicitud.';
        } else if (errMsg.includes('not-in-group') || errMsg.includes('removed')) {
          responseMsg = '《✧》 *No se pudo unir al grupo*\n\nEl bot fue eliminado recientemente o no puede unirse.';
        } else if (errMsg.includes('invite') || errMsg.includes('código') || errMsg.includes('code')) {
          responseMsg = '《✧》 *El enlace no es válido*\n\nEl código de invitación ha expirado o es incorrecto.';
        } else if (errMsg.includes('full') || errMsg.includes('lleno')) {
          responseMsg = '《✧》 *El grupo está lleno*\n\nEl grupo tiene el máximo de participantes (1024).';
        } else if (errMsg.includes('blocked') || errMsg.includes('bloqueado')) {
          responseMsg = '《✧》 *El bot está bloqueado*\n\nAlgún participante del grupo ha bloqueado al bot.';
        }

        await replyWithContext(responseMsg, [senderJid]);
      }

    } catch (error) {
      console.error('Error en join:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
  }
};