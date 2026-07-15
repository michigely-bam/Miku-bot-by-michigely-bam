export default {
    name: 'ping',
    alias: ['speed', 'p', 'test'],
    description: 'Latencia',
    category: 'main',
    
    async execute(sock, msg, { args, command, body, config, startTime, isOwner, pushName, userNumber, isGroup, expResult, replyWithContext }) {
        
        const messageTimestamp = msg.messageTimestamp || msg.message?.messageTimestamp;
        const userSendTime = messageTimestamp * 1000;
        
        const now = Date.now();
        
        const ping = now - userSendTime;
        
        const response = `🌠 ¡Pong!\n> *Velocidad ⧖ ${ping}ms*`;
        
        await replyWithContext(response);
    }
};