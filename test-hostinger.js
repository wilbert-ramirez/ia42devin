const nodemailer = require('nodemailer');
require('dotenv').config();

async function testHostinger() {
    console.log('🧪 Testing Hostinger SMTP...');
    
    // Configuración específica Hostinger
    const config = {
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false, // STARTTLS
        auth: {
            user: 'coach@ia42.cloud',
            pass: '#F1lm0r4$'
        },
        tls: {
            rejectUnauthorized: false,
            minVersion: "TLSv1.2"
        },
        connectionTimeout: 60000,   // 60 segundos
        greetingTimeout: 30000,     // 30 segundos
        socketTimeout: 60000,       // 60 segundos
        debug: true,                // Más información
        logger: true
    };

    try {
        const transporter = nodemailer.createTransport(config);
        
        console.log('📡 Verificando conexión...');
        await transporter.verify();
        console.log('✅ Conexión exitosa!');
        
        console.log('📧 Enviando email de prueba...');
        const info = await transporter.sendMail({
            from: 'coach@ia42.cloud',
            to: 'wilber.ramirez@ia42.cloud',
            subject: 'Test IA42 - ' + new Date().toLocaleString(),
            text: 'Email funcionando desde Hostinger!'
        });
        
        console.log('✅ Email enviado:', info.messageId);
        console.log('📋 Info completa:', info);
        
    } catch (error) {
        console.error('❌ Error detallado:', error);
    }
}

testHostinger();