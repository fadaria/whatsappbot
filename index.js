const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Cria a pasta auth_info se não existir
if (!fs.existsSync('./auth_info')) {
    fs.mkdirSync('./auth_info');
}

// Servidor web - necessário para o Render não matar o processo
app.get('/', (req, res) => {
    res.send('WhatsApp Web rodando 24/7!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor web rodando na porta ${PORT}`);
});

async function startBot() {
    console.log('🔄 Iniciando conexão com WhatsApp...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Chrome (Render)', 'Linux', '10.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 ESCANEIE O QR CODE ABAIXO:');
            qrcode.generate(qr, { small: true });
            console.log('\n📱 Passos:');
            console.log('1. Abra o WhatsApp no seu celular');
            console.log('2. Toque nos 3 pontinhos (⋮) > Dispositivos conectados');
            console.log('3. Toque em "Conectar um dispositivo"');
            console.log('4. Escaneie o QR Code acima\n');
        }

        if (connection === 'open') {
            console.log('✅ CONECTADO COM SUCESSO!');
            console.log('✅ Seu WhatsApp está rodando 24/7 de graça no Render!');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexão fechada, reconectando em 5 segundos...');
            if (shouldReconnect) {
                setTimeout(startBot, 5000);
            } else {
                console.log('❌ Desconectado permanentemente. Delete a pasta auth_info e recomece.');
            }
        }
    });

    // Resposta automática para "oi"
    sock.ev.on('messages.upsert', async (msg) => {
        try {
            const message = msg.messages[0];
            if (!message.key.fromMe && message.message?.conversation) {
                const text = message.message.conversation.toLowerCase();
                if (text === 'oi' || text === 'ola' || text === 'olá') {
                    await sock.sendMessage(message.key.remoteJid, { 
                        text: 'Olá! 🤖 Estou rodando 24/7 de graça no Render!'
                    });
                    console.log('✅ Respondi uma mensagem');
                }
            }
        } catch (err) {
            console.log('Erro ao processar mensagem:', err.message);
        }
    });
}

startBot();
