import { getPairingCode, getMain } from '../lib/main.js'
import chalk from 'chalk'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOLDOWN_FILE = path.join(__dirname, '..', 'databases', 'code_cooldown_main.json');

if (!fs.existsSync(path.join(__dirname, '..', 'databases'))) {
    fs.mkdirSync(path.join(__dirname, '..', 'databases'), { recursive: true });
}

function loadCooldown() {
    try {
        if (fs.existsSync(COOLDOWN_FILE)) {
            return JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveCooldown(data) {
    try {
        fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2));
    } catch (e) {}
}

export default {
    name: 'codemod',
    alias: ['mainbot', 'crearmain'],
    description: 'Genera un código de emparejamiento para vincular un Main-Bot',
    category: 'owner',
    
    async execute(sock, msg, options) {
        const { args = [], config = {}, pushName = 'Usuario', userNumber = '', replyWithContext, isOwner, senderNumber } = options
        
        const isUserOwner = config.owner && config.owner.some(ownerNum => 
            ownerNum.replace(/\D/g, '') === (senderNumber || '').replace(/\D/g, '')
        );
        
        if (!isUserOwner && !isOwner) {
            return await replyWithContext(`🌌 El comando \`${config.prefix}codemod\` es solo para el propietario.\n> Usa ${config.prefix}help para ver mis comandos`);
        }
        
        let targetNumber = args[0]?.replace(/\D/g, '') || userNumber
        
        if (!targetNumber || targetNumber === 'Desconocido') {
            return await replyWithContext('❌ No se pudo obtener el número.')
        }
        
        const cooldowns = loadCooldown();
        const lastUsed = cooldowns[targetNumber];
        const now = Date.now();
        const cooldownTime = 2 * 60 * 1000;
        
        if (lastUsed && (now - lastUsed) < cooldownTime) {
            const tiempoRestante = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
            const minutos = Math.floor(tiempoRestante / 60);
            const segundos = tiempoRestante % 60;
            let tiempoTexto = minutos > 0 ? `${minutos} minuto(s) y ${segundos} segundo(s)` : `${segundos} segundo(s)`;
            return await replyWithContext(`🌌 Debes esperar \`${tiempoTexto}\` para volver a intentar`);
        }
        
        cooldowns[targetNumber] = now;
        saveCooldown(cooldowns);
        
        await replyWithContext(`🌌 \`GALAXIT MAIN\`\n> Conecta un Main-Bot\n\n WhatsApp > Dispositivos vinculados > Vincular > Vincular con número > Pega el código\n\n> El código expira en 60 segundos`);
        
        console.log(chalk.cyan(`[ MAIN-BOT ] Usuario ${pushName} (${targetNumber}) generando código...`));
        
        try {
            const result = await getPairingCode(targetNumber)
            
            if (result.status === 'pending') {
                await replyWithContext(`${result.code}`)
                
                console.log(chalk.green(`[ MAIN-BOT ] Código generado para ${targetNumber}: ${result.code}`))
                
                let checkInterval
                const timeout = setTimeout(() => {
                    if (checkInterval) clearInterval(checkInterval)
                }, 60000)
                
                checkInterval = setInterval(async () => {
                    const main = getMain(targetNumber)
                    if (main && main.sock && main.sock.user) {
                        clearTimeout(timeout)
                        clearInterval(checkInterval)
                        await replyWithContext(`🌌 @${targetNumber} Ha conectado un nuevo Main-Bot`, [`${targetNumber}@s.whatsapp.net`])
                        console.log(chalk.green(`[ MAIN-BOT ] ${targetNumber} conectado por ${pushName}`))
                    }
                }, 2000)
                
            } else if (result.status === 'connected') {
                await replyWithContext(`🌌 @${targetNumber} Ya tiene un Main-Bot conectado`, [`${targetNumber}@s.whatsapp.net`])
            } else if (result.status === 'expired') {
                await replyWithContext(`⌛ El código expiró. Usa *${config.prefix}codemod +numero* nuevamente.`)
            }
            
        } catch (err) {
            console.log(chalk.red(`Error: ${err.message}`))
            await replyWithContext(`💤 Error: ${err.message}`)
        }
    }
}