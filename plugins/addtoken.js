import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPairingCode, getPrem, getPrems } from '../lib/prem.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREMS_FILE = path.join(__dirname, '..', 'databases', 'prems.json');

if (!fs.existsSync(path.join(__dirname, '..', 'databases'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'databases'), { recursive: true });
}

function loadPrems() {
    try {
        if (fs.existsSync(PREMS_FILE)) {
            return JSON.parse(fs.readFileSync(PREMS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function savePrems(data) {
    try {
        fs.writeFileSync(PREMS_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
}

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function checkSessionActive(number) {
    try {
        const sessionPath = path.join(process.cwd(), 'Sessions', 'Prems', number);
        const credsPath = path.join(sessionPath, 'creds.json');
        
        if (!fs.existsSync(sessionPath)) return false;
        if (!fs.existsSync(credsPath)) return false;
        
        const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        return creds?.me?.id ? true : false;
    } catch (err) {
        return false;
    }
}

function checkBotConnected(number) {
    try {
        const prem = getPrem(number);
        return prem?.sock?.user ? true : false;
    } catch (err) {
        return false;
    }
}

export default {
    name: 'addtoken',
    alias: ['creartoken', 'gentoken'],
    description: 'Genera un token de 8 dígitos para vincular Premium-Bots',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { config, replyWithContext, isOwner, senderNumber, pushName } = options;
            const from = msg.key.remoteJid;
            
            const isUserOwner = config.owner && config.owner.some(ownerNum => 
                ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
            );
            
            if (!isUserOwner && !isOwner) {
                return await replyWithContext(`🌌 El comando \`${config.prefix}addtoken\` es solo para el propietario.\n> Usa ${config.prefix}help para ver mis comandos`);
            }
            
            const token = generateToken();
            
            const premsData = loadPrems();
            premsData[token] = {
                token: token,
                number: null,
                createdAt: Date.now(),
                createdBy: senderNumber || 'Desconocido',
                used: false
            };
            savePrems(premsData);
            
            const message = `🍟 *Token generado exitosamente*\n\n` +
                           `🔑 *Token:* \`${token}\`\n` +
                           `📌 *Estado:* No vinculado\n` +
                           `👤 *Creado por:* @${senderNumber}\n` +
                           `📅 *Fecha:* ${new Date().toLocaleString()}\n\n` +
                           `> Usa *${config.prefix}codepremium ${token}* para vincular un Premium-Bot`;
            
            await sock.sendMessage(from, {
                text: message,
                mentions: [`${senderNumber}@s.whatsapp.net`]
            }, { quoted: msg });
            
            console.log(chalk.green(`[ ADDTOKEN ] Token ${token} creado por ${pushName} (${senderNumber})`));
            
        } catch (error) {
            console.error('❌ Error en addtoken:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};