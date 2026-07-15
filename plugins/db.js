import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '..', 'databases', 'users.json');
const LEVEL_FILE = path.join(__dirname, '..', 'databases', 'level.json');
const PACKS_FILE = path.join(__dirname, '..', 'databases', 'packs.json');

function getUserPacksCount(packsDB, userNumber) {
    try {
        if (!packsDB[userNumber] ||!packsDB[userNumber].packs) return 0;
        return packsDB[userNumber].packs.length;
    } catch (error) {
        return 0;
    }
}

export default {
    name: 'db',
    alias: [],
    description: 'Ver base de datos de usuarios', // <- opcional pero queda prolijo
    category: 'Owner', // <- ACA ESTA

    async execute(sock, msg, options) {
        try {
            const { config, args, senderNumber, pushName, replyWithContext } = options;
            const from = msg.key.remoteJid;

            const OWNER_ID = '5492644156919';

            const cleanSenderNumber = senderNumber? senderNumber.replace(/[^0-9]/g, '') : '';

            if (cleanSenderNumber!== OWNER_ID) {
                await replyWithContext(
                    `💎 El comando \`${config.prefix}db\` No existe.\n> 🎀̶ֵ ᥙsᥲ ${config.prefix}help ⍴ᥲrᥲ ᥎ᥱr mіs ᥴ᥆mᥲᥒძ᥆s`,
                    []
                );
                return;
            }

            try {
                await sock.sendMessage(from, { react: { text: '📊', key: msg.key } });
            } catch (e) {}

            // Cargar bases de datos
            let usersDB = {};
            let levelDB = {};
            let packsDB = {};

            try {
                if (fs.existsSync(USERS_FILE)) usersDB = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
                if (fs.existsSync(LEVEL_FILE)) levelDB = JSON.parse(fs.readFileSync(LEVEL_FILE, 'utf8'));
                if (fs.existsSync(PACKS_FILE)) packsDB = JSON.parse(fs.readFileSync(PACKS_FILE, 'utf8'));
            } catch (error) {
                console.error('Error cargando bases de datos:', error);
            }

            const totalUsers = Object.keys(usersDB).length;

            if (totalUsers === 0) {
                await replyWithContext(
                    `📁 *No hay usuarios registrados*`,
                    []
                );
                return;
            }

            // Construir mensaje con todos los usuarios
            let message = `╭ִׄ─ֺ࡙─ᰮ̥━̼╸╼ֺ࡙🍒╾ׄ╺ֺ━ִ─ֺ̥─꥓̼╮ֺ\n *Lista de usuarios*\n⏝ּ̥〫⌣꥓ּ︶̥✿ֺ꤫❀꥓ּ︶ִ̥⌣𝅼⏝ּ̥〫\n\n`;
            message += `ㅤׅ̥݀֯𐔌ּ࡙݀͡🍭 *TOTAL: ${totalUsers} usuarios*\n\n`;

            // Ordenar usuarios por número
            const sortedUsers = Object.entries(usersDB).sort((a, b) => a[0].localeCompare(b[0]));

            for (const [number, user] of sortedUsers) {
                const levelInfo = levelDB[number] || { level: 1, exp: 0, commands: 0 };
                const packsCount = getUserPacksCount(packsDB, number);
                const userName = user.pushName || user.name || 'Sin nombre';

                message += `• *Nombre* » ${userName}\n`;
                message += `• *Number* » ${number}\n`;
                message += `• *Nivel* » ${levelInfo.level}\n`;
                message += `• *Exp* » ${levelInfo.exp.toLocaleString()}\n`;
                message += `• *Packs* » ${packsCount}\n`;
                message += `• *Total Comandos* » ${levelInfo.commands.toLocaleString()}\n\n`;
            }

            // Verificar si el mensaje es demasiado largo (WhatsApp límite ~65k caracteres)
            if (message.length > 60000) {
                // Enviar por partes
                const chunkSize = 30; // 30 usuarios por mensaje
                const usersArray = Object.entries(usersDB);
                const totalChunks = Math.ceil(usersArray.length / chunkSize);

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = usersArray.slice(i * chunkSize, (i + 1) * chunkSize);
                    let chunkMessage = `╭ִׄ─ֺ࡙─ᰮ̥━̼╸╼ֺ࡙🍒╾ׄ╺ֺ━ִ─ֺ̥─꥓̼╮ֺ\n *Lista de usuarios (${i + 1}/${totalChunks})*\n⏝ּ̥〫⌣꥓ּ︶̥✿ֺ꤫❀꥓ּ︶ִ̥⌣𝅼⏝ּ̥〫\n\n`;

                    for (const [number, user] of chunk) {
                        const levelInfo = levelDB[number] || { level: 1, exp: 0, commands: 0 };
                        const packsCount = getUserPacksCount(packsDB, number);
                        const userName = user.pushName || user.name || 'Sin nombre';

                        chunkMessage += `• *Nombre* » ${userName}\n`;
                        chunkMessage += `• *Number* » ${number}\n`;
                        chunkMessage += `• *Nivel* » ${levelInfo.level}\n`;
                        chunkMessage += `• *Exp* » ${levelInfo.exp.toLocaleString()}\n`;
                        chunkMessage += `• *Packs* » ${packsCount}\n`;
                        chunkMessage += `• *Total Comandos* » ${levelInfo.commands.toLocaleString()}\n\n`;
                    }

                    await replyWithContext(chunkMessage, []);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo entre mensajes
                }

                try {
                    await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
                } catch (e) {}

                console.log(`📊 DB enviada por OWNER ${pushName || senderNumber}: ${totalUsers} usuarios en ${totalChunks} mensajes`);
                return;
            }

            await replyWithContext(message, []);

            try {
                await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });
            } catch (e) {}

            console.log(`📊 DB enviada por OWNER ${pushName || senderNumber}: ${totalUsers} usuarios`);

        } catch (error) {
            console.error('❌ Error en db:', error);

            try {
                await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
            } catch (e) {}

            await replyWithContext(
                `❌ Error: ${error.message}`,
                []
            );
        }
    }
};