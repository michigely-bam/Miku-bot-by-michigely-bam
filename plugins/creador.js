export default {
    name: 'creador',
    alias: ['owner', 'propietario', 'creador'],
    category: 'Herramientas',
    description: 'Muestra info del creador y links oficiales',

    async execute(sock, msg, { config }) {
        try {
            const from = msg.key.remoteJid;
            
            const ownerNumber = '5492644156919'; // sin +
            const ownerName = 'ᶻ 𝗓 𐰁';
            const canalLink = 'https://whatsapp.com/channel/0029VbCq9xP2ZjCr6AGMzi1b';
            const grupoLink = 'https://chat.whatsapp.com/G3SjivkF8hZ7thtMMGCjcy';
            const soporteLink = 'https://chat.whatsapp.com/F6mDwGTO79eCYrBs6CVndD';
            const mensaje = 'Puedes solicitar códigos premium para tener un prem bot totalmente gratis';

            // 1. Mensaje con la info
            const text = `╭─────────────────╮
│ *🏮𔖮๋ׅꉹ᮫ִׁ owner +${ownerNumber}*
│ *🏮𔖮๋ׅꉹ᮫ִׁ name » ${ownerName}*
│ *🏮𔖮๋ׅꉹ᮫ִׁ ${mensaje}*
│ *🏮𔖮๋ׅꉹ᮫ִׁ canal oficial*
${canalLink}
│ *🏮𔖮๋ׅꉹ᮫ִׁ Grupo oficial*
${grupoLink}
│ *🏮𔖮๋ׅꉹ᮫ִׁ Grupo de soporte*
${soporteLink}
╰─────>`;

            await sock.sendMessage(from, { 
                text,
                contextInfo: {
                    mentionedJid: [ownerNumber + '@s.whatsapp.net']
                }
            }, { quoted: msg });

            // 2. Enviar tu contacto
            const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName}
TEL;type=CELL;waid=${ownerNumber}:+${ownerNumber}
END:VCARD`;

            await sock.sendMessage(from, {
                contacts: {
                    displayName: ownerName,
                    contacts: [{ vcard }]
                }
            });

        } catch (error) {
            console.error('❌ Error en creador:', error);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};