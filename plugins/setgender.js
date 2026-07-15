import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '..', 'databases', 'users.json');

function loadUsersDB() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }
        return {};
    } catch (error) {
        console.error('Error cargando users.json:', error);
        return {};
    }
}

function saveUsersDB(users) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error guardando users.json:', error);
        return false;
    }
}

export default {
    name: 'setgender',
    alias: ['setgenero'],
 category: 'economy',
    
    async execute(sock, msg, options) {
        try {
            const { config, args, senderNumber, senderJid, pushName, replyWithContext } = options;
            const from = msg.key.remoteJid;
            
            const gender = args.join(' ').trim().toLowerCase();
            
            if (!gender) {
                await replyWithContext(
                    `🌟 Debes proporcionar un género\n> Opciones: hombre, mujer, otro`,
                    []
                );
                return;
            }
            
            let genderText = '';
            if (gender === 'hombre' || gender === 'masculino' || gender === 'm') {
                genderText = 'Hombre';
            } else if (gender === 'mujer' || gender === 'femenino' || gender === 'f') {
                genderText = 'Mujer';
            } else if (gender === 'otro' || gender === 'no binario' || gender === 'nb') {
                genderText = 'Otro';
            } else {
                await replyWithContext(
                    `🌟 Género no válido\n> Opciones: hombre, mujer, otro`,
                    []
                );
                return;
            }
            
            const users = loadUsersDB();
            
            if (!users[senderNumber]) {
                users[senderNumber] = {
                    number: senderNumber,
                    pushName: pushName || 'Usuario',
                    registered: new Date().toISOString()
                };
            }
            
            users[senderNumber].gender = genderText;
            saveUsersDB(users);
            
            await replyWithContext(
                `🌵 Género establecido con éxito: ${genderText}`,
                []
            );
            
        } catch (error) {
            console.error('❌ Error en setgender:', error);
            await replyWithContext(`❌ Error: ${error.message}`, []);
        }
    }
};