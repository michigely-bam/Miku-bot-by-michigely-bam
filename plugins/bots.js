import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMainBotNumber() {
    try {
        const credsPath = path.join(process.cwd(), 'sessions', 'creds.json');
        if (fs.existsSync(credsPath)) {
            const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            if (creds?.me?.id) {
                const number = creds.me.id.split(':')[0].replace(/[^0-9]/g, '');
                return number;
            }
        }
    } catch (err) {}
    return null;
}

function getMainBotName() {
    try {
        const configPath = path.join(process.cwd(), 'config.js');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const match = content.match(/nombre:\s*['"]([^'"]+)['"]/);
            if (match) return match[1];
            const match2 = content.match(/name:\s*['"]([^'"]+)['"]/);
            if (match2) return match2[1];
        }
    } catch (err) {}
    return 'Principal';
}

function getBanner(config, isSubBot = false, subNumber = '') {
    try {
        let bannerPath = null;
        let bannerType = 'image';
        
        if (isSubBot && subNumber) {
            const extensiones = ['mp4', 'jpg', 'jpeg'];
            for (const ext of extensiones) {
                const subBannerPath = path.join(process.cwd(), 'subs', subNumber, `banner.${ext}`);
                if (fs.existsSync(subBannerPath)) {
                    bannerPath = subBannerPath;
                    if (ext === 'mp4') bannerType = 'video';
                    break;
                }
            }
        }
        
        if (!bannerPath) {
            const imgDir = path.join(process.cwd(), 'img');
            const extensiones = ['mp4', 'jpg', 'jpeg'];
            for (const ext of extensiones) {
                const imgBannerPath = path.join(imgDir, `banner.${ext}`);
                if (fs.existsSync(imgBannerPath)) {
                    bannerPath = imgBannerPath;
                    if (ext === 'mp4') bannerType = 'video';
                    break;
                }
            }
        }
        
        if (bannerPath && fs.existsSync(bannerPath)) {
            return { buffer: fs.readFileSync(bannerPath), type: bannerType };
        }
        
        return null;
    } catch (err) {
        return null;
    }
}

function loadConfigSync(directory) {
    try {
        const configPath = path.join(process.cwd(), 'subs', directory, 'config.js');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const match = content.match(/export default\s+({[\s\S]*})/);
            if (match && match[1]) {
                return eval('(' + match[1] + ')');
            }
        }
    } catch (err) {}
    return null;
}

function getBotsFromFolder() {
    const dir = path.join(process.cwd(), 'subs');
    const botsInfo = [];
    
    if (fs.existsSync(dir)) {
        const folders = fs.readdirSync(dir).filter(folder => {
            const folderPath = path.join(dir, folder);
            return fs.statSync(folderPath).isDirectory() && /^\d+$/.test(folder);
        });
        
        for (const folder of folders) {
            const botConfig = loadConfigSync(folder);
            const isMain = botConfig?.mainBot === true;
            const isPrem = botConfig?.premBot === true;
            
            let type = 'Sub';
            if (isPrem) type = 'Premium';
            else if (isMain) type = 'Main';
            
            if (botConfig) {
                botsInfo.push({
                    number: folder,
                    name: botConfig.nombre || botConfig.name || (type === 'Sub' ? 'SubBot' : type === 'Main' ? 'MainBot' : 'PremiumBot'),
                    prefix: botConfig.prefix || '.',
                    type: type
                });
            } else {
                botsInfo.push({
                    number: folder,
                    name: 'Bot',
                    prefix: '.',
                    type: 'Sub'
                });
            }
        }
    }
    
    return botsInfo;
}

export default {
    name: 'bots',
    alias: ['totalbots'],
    description: 'Muestra los bots conectados',
    category: 'main',
    
    async execute(sock, msg, options) {
        try {
            const { config, isSubBot, replyWithContext } = options;
            const from = msg.key.remoteJid;
            
            const esSubBot = sock.isSubBot === true;
            const subNumber = sock.subNumber || '';
            
            const mainBotNumber = getMainBotNumber();
            const mainBotName = getMainBotName();
            
            const allBotsInfo = getBotsFromFolder();
            
            const subBotsInfo = allBotsInfo.filter(bot => bot.type === 'Sub');
            const mainBotsInfo = allBotsInfo.filter(bot => bot.type === 'Main');
            const premBotsInfo = allBotsInfo.filter(bot => bot.type === 'Premium');
            
            const totalSubs = subBotsInfo.length;
            const totalMains = mainBotsInfo.length;
            const totalPrems = premBotsInfo.length;
            const totalSessions = totalSubs + totalMains + totalPrems + 1;
            
            let botsInGroup = [];
            
            if (from.endsWith('@g.us')) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    const participants = groupMetadata.participants;
                    
                    if (mainBotNumber) {
                        const mainBotJid = `${mainBotNumber}@s.whatsapp.net`;
                        if (participants.some(p => p.id === mainBotJid || p.id === mainBotNumber)) {
                            botsInGroup.push({
                                number: mainBotNumber,
                                name: mainBotName,
                                type: 'Principal',
                                jid: mainBotJid
                            });
                        }
                    }
                    
                    for (const main of mainBotsInfo) {
                        const mainJid = `${main.number}@s.whatsapp.net`;
                        if (participants.some(p => p.id === mainJid || p.id === main.number)) {
                            botsInGroup.push({
                                number: main.number,
                                name: main.name,
                                type: 'Principal',
                                jid: mainJid
                            });
                        }
                    }
                    
                    for (const prem of premBotsInfo) {
                        const premJid = `${prem.number}@s.whatsapp.net`;
                        if (participants.some(p => p.id === premJid || p.id === prem.number)) {
                            botsInGroup.push({
                                number: prem.number,
                                name: prem.name,
                                type: 'Premium',
                                jid: premJid
                            });
                        }
                    }
                    
                    for (const sub of subBotsInfo) {
                        const subJid = `${sub.number}@s.whatsapp.net`;
                        if (participants.some(p => p.id === subJid || p.id === sub.number)) {
                            botsInGroup.push({
                                number: sub.number,
                                name: sub.name,
                                type: 'Sub',
                                jid: subJid
                            });
                        }
                    }
                } catch (err) {}
            }
            
            let text = `🌐 Total: ${totalSessions} sesiones\n\n`;
            text += `🌌 Principales: ${totalMains + 1} sesiones\n`;
            text += `🌌 Premiums: ${totalPrems} sesiones\n`;
            text += `🌌 Subs: ${totalSubs} sesiones\n\n`;
            
            if (from.endsWith('@g.us')) {
                text += `🛠️ *en este grupo* (${botsInGroup.length})\n\n`;
                
                if (botsInGroup.length > 0) {
                    for (const bot of botsInGroup) {
                        text += `🌌 ${bot.type} - ${bot.name} » @${bot.number}\n`;
                    }
                } else {
                    text += `🌌 No hay bots en este grupo\n`;
                }
            } else {
                text += `🌐 Bots disponibles\n\n`;
                if (mainBotNumber) {
                    text += `🌌 Principal - ${mainBotName} » @${mainBotNumber}\n`;
                }
                for (const main of mainBotsInfo) {
                    text += `🌌 Principal - ${main.name} » @${main.number}\n`;
                }
                for (const prem of premBotsInfo) {
                    text += `🌌 Premium - ${prem.name} » @${prem.number}\n`;
                }
                for (const sub of subBotsInfo) {
                    text += `🌌 Sub - ${sub.name} » @${sub.number}\n`;
                }
            }
            
            const mentions = botsInGroup.map(bot => bot.jid);
            
            const banner = getBanner(config, esSubBot, subNumber);
            
            if (banner) {
                if (banner.type === 'video') {
                    await sock.sendMessage(from, {
                        video: banner.buffer,
                        caption: text.trim(),
                        mentions: mentions,
                        contextInfo: {
                            mentionedJid: mentions,
                            forwardingScore: 9999999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: config.canalId || '',
                                serverMessageId: 0,
                                newsletterName: config.canalNombre || ''
                            }
                        }
                    }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, {
                        image: banner.buffer,
                        caption: text.trim(),
                        mentions: mentions,
                        contextInfo: {
                            mentionedJid: mentions,
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
            } else {
                await sock.sendMessage(from, {
                    text: text.trim(),
                    mentions: mentions,
                    contextInfo: {
                        mentionedJid: mentions,
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
            
            console.log(`📊 Bots info mostrado a ${options.pushName || 'Usuario'}`);
            
        } catch (error) {
            console.error('❌ Error en bots:', error);
            
            try {
                const { replyWithContext } = options;
                await replyWithContext(`❌ Error: ${error.message}`);
            } catch (e) {}
        }
    }
};