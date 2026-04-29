const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

// Cria a pasta de autenticação se não existir
if (!fs.existsSync('./auth_info')) {
    fs.mkdirSync('./auth_info');
}

// Servidor web - obrigatório para o Render não matar o processo
app.get('/', (req, res) => {
    res.send('WhatsApp Web rodando!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ Servidor web iniciado na porta ' + PORT);
    iniciarWhatsApp();
});

async function iniciarWhatsApp() {
    try {
        console.log('🔄 Iniciando WhatsApp...');
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['Chrome', 'Linux', '10.0']
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('\n📱 ESCANEIE O QR CODE ACIMA com seu WhatsApp!\n');
            }

            if (connection === 'open') {
                console.log('✅ CONECTADO COM SUCESSO!');
            }

            if (connection === 'close') {
                const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
                if (loggedOut) {
                    console.log('❌ Desconectado. Delete a pasta auth_info e reconecte.');
                } else {
                    console.log('🔄 Reconectando em 5 segundos...');
                    setTimeout(iniciarWhatsApp, 5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async (msg) => {
            try {
                const m = msg.messages[0];
                if (m.key.fromMe) return;
                const texto = m.message?.conversation || '';
                if (texto.toLowerCase() === 'oi') {
                    await sock.sendMessage(m.key.remoteJid, { text: 'Olá! 🤖' });
                    console.log('✅ Respondi: oi');
                }
            } catch (e) {
                // ignora erro
            }
        });

    } catch (erro) {
        console.log('❌ Erro:', erro.message);
        console.log('🔄 Tentando novamente em 10 segundos...');
        setTimeout(iniciarWhatsApp, 10000);
    }
}
