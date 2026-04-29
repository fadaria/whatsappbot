const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 10000;

// Isso evita o Render desligar o serviço por inatividade
app.get('/', (req, res) => {
  res.send('WhatsApp rodando 24/7!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    browser: ['Chrome', 'Linux', ''],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('\n📱 ESCANEIE O QR CODE ACIMA com seu WhatsApp');
      console.log('📱 Abra o WhatsApp no celular > Menu > Dispositivos conectados > Conectar');
    }

    if (connection === 'open') {
      console.log('✅ CONECTADO COM SUCESSO!');
      console.log('✅ Seu WhatsApp está rodando 24/7 de graça!');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão fechada, reconectando...');
      if (shouldReconnect) {
        startBot();
      } else {
        console.log('❌ Desconectado permanentemente. Delete a pasta auth_info e recomece.');
      }
    }
  });

  // Exemplo: responder "Olá" quando alguém mandar "oi"
  sock.ev.on('messages.upsert', async (msg) => {
    const message = msg.messages[0];
    if (!message.key.fromMe && message.message?.conversation) {
      const text = message.message.conversation.toLowerCase();
      if (text === 'oi') {
        await sock.sendMessage(message.key.remoteJid, { text: 'Olá! 🤖 Estou rodando 24/7 de graça no Render!' });
      }
    }
  });
}

startBot();
