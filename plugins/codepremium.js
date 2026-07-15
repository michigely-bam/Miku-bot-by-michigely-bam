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
    name: 'codepremium',
    alias: ['codeprem', 'premcode'],
    description: 'Genera un código de emparejamiento para vincular un Premium-Bot usando un token',
    category: 'owner',
    
    async execute(sock, msg, options) {
        try {
            const { args = [], config, replyWithContext, pushName } = options;
            const from = msg.key.remoteJid;
            
            const senderJid = msg.key.participant || msg.key.remoteJid || '';
            const targetNumber = senderJid.split('@')[0].replace(/\D/g, '');
            
            if (!targetNumber) {
                return await replyWithContext('❌ No se pudo obtener tu número.');
            }
            
            const token = args[0] || '';
            
            if (!token) {
                return await replyWithContext(`🍟 Debes proporcionar un token.\n> Usa: *${config.prefix}codepremium <token>*\n> Ejemplo: *${config.prefix}codepremium 1234AbCd*`);
            }
            
            const premsData = loadPrems();
            
            if (!premsData[token]) {
                return await replyWithContext(`🍟 El token \`${token}\` no existe.\n> Contacta al propietario para obtener un token válido.`);
            }
            
            const tokenData = premsData[token];
            
            if (tokenData.used && tokenData.number) {
                const isSessionActive = checkSessionActive(tokenData.number);
                const isBotConnected = checkBotConnected(tokenData.number);
                
                if (isSessionActive || isBotConnected) {
                    const premJid = `${tokenData.number}@s.whatsapp.net`;
                    const message = `🍟 El token \`${token}\` ya fue vinculado a @${tokenData.number}\n> Si crees que esto es un error o tu token fue robado contacta a soporte.`;
                    
                    return await sock.sendMessage(from, {
                        text: message,
                        mentions: [premJid]
                    }, { quoted: msg });
                } else {
                    tokenData.used = false;
                    tokenData.number = null;
                    savePrems(premsData);
                    console.log(chalk.yellow(`[ CODEPREMIUM ] Token ${token} liberado (sesión inactiva)`));
                }
            }
            
            await replyWithContext(`🍟 \`GALAXIT PREMIUM\`\n> Conecta un Premium-Bot\n\n WhatsApp > Dispositivos vinculados > Vincular > Vincular con número > Pega el código\n\n> El código expira en 60 segundos`);
            
            console.log(chalk.cyan(`[ CODEPREMIUM ] Usuario ${pushName || 'Usuario'} (${targetNumber}) generando código con token ${token}...`));
            
            try {
                const result = await getPairingCode(targetNumber);
                
                if (result.status === 'pending') {
                    const formattedCode = result.code || '';
                    
                    // Enviar código con botón de copiar
                    await sock.sendMessage(from, {
                        text: `${formattedCode}`,
                        interactiveButtons: [
                            {
                                name: "cta_copy",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Copy",
                                    copy_code: formattedCode
                                })
                            }
                        ]
                    }, { quoted: msg });
                    
                    console.log(chalk.green(`[ CODEPREMIUM ] Código generado para ${targetNumber}: ${formattedCode}`));
                    
                    tokenData.used = true;
                    tokenData.number = targetNumber;
                    tokenData.usedAt = Date.now();
                    tokenData.usedBy = targetNumber;
                    savePrems(premsData);
                    
                    let checkInterval;
                    const timeout = setTimeout(() => {
                        if (checkInterval) clearInterval(checkInterval);
                    }, 60000);
                    
                    checkInterval = setInterval(async () => {
                        const prem = getPrem(targetNumber);
                        if (prem && prem.sock && prem.sock.user) {
                            clearTimeout(timeout);
                            clearInterval(checkInterval);
                            
                            const premJid = `${targetNumber}@s.whatsapp.net`;
                            await sock.sendMessage(from, {
                                text: `🍟 @${targetNumber} Ha conectado un nuevo Premium-Bot\n> Token: \`${token}\``,
                                mentions: [premJid]
                            }, { quoted: msg });
                            
                            console.log(chalk.green(`[ CODEPREMIUM ] ${targetNumber} conectado por ${pushName} con token ${token}`));
                            
                            const newPremsData = loadPrems();
                            if (newPremsData[token]) {
                                newPremsData[token].connected = true;
                                newPremsData[token].connectedAt = Date.now();
                                savePrems(newPremsData);
                            }
                        }
                    }, 2000);
                    
                } else if (result.status === 'connected') {
                    await replyWithContext(`🍟 @${targetNumber} Ya tiene un Premium-Bot conectado`, [`${targetNumber}@s.whatsapp.net`]);
                } else if (result.status === 'expired') {
                    tokenData.used = false;
                    tokenData.number = null;
                    savePrems(premsData);
                    await replyWithContext(`⌛ El código expiró. Usa *${config.prefix}codepremium ${token}* nuevamente.`);
                }
                
            } catch (err) {
                console.log(chalk.red(`Error: ${err.message}`));
                await replyWithContext(`💤 Error: ${err.message}`);
            }
            
        } catch (error) {
            console.error('❌ Error en codepremium:', error);
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};