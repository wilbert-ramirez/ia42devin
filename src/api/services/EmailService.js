// src/api/services/EmailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

 // En src/api/services/EmailService.js
// Reemplaza el método initializeTransporter() completo:

async initializeTransporter() {
    try {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_PORT == "465", // true para 465, false para 587
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                rejectUnauthorized: false,
                minVersion: "TLSv1.2"
            },
            // Timeouts más largos para Hostinger
            connectionTimeout: 60000,   // 60 segundos
            greetingTimeout: 30000,     // 30 segundos
            socketTimeout: 60000        // 60 segundos
        });

        // Verificar la conexión
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            await this.transporter.verify();
        } else {
        }

    } catch (error) {
        this.transporter = null;
    }
}

async sendConfirmationEmail(email, token, name = '') {
    if (!this.transporter) {
        return { success: false, message: 'Servicio de email no configurado' };
    }

    try {
       // const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/app?confirm=${token}`;
        const confirmationUrl = `${process.env.FRONTEND_URL || 'https://ia42.online'}/app/login.html?confirm=${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@ia42.com',
            to: email,
            subject: '🚀 ¡Bienvenido a IA42! Confirma tu cuenta',
            html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bienvenido a IA42</title>
  <style>
    body {
      background-color: #0A0F1E;
      color: #F9FAFB;
      font-family: 'Segoe UI', sans-serif;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #0A0F1E;
      padding: 30px;
      border-radius: 10px;
      border: 1px solid #212B3A;
    }
    .logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo img {
      height: 60px;
    }
    h2 {
      color: #FFD700;
      text-align: center;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #F9FAFB;
    }
    .button {
      display: inline-block;
      background-color: #FA810C;
      color: #F9FAFB;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: bold;
      margin: 20px 0;
      transition: background-color 0.3s ease;
    }
    .button:hover {
      background-color: #e6730b;
    }
    .footer {
      font-size: 12px;
      color: #9DA3AE;
      text-align: center;
      margin-top: 30px;
    }
    
    /* Responsive para móviles */
    @media only screen and (max-width: 600px) {
      .container {
        margin: 20px;
        padding: 20px;
      }
      .logo img {
        height: 50px;
      }
      h2 {
        font-size: 20px;
      }
      p {
        font-size: 14px;
      }
      .button {
        padding: 10px 20px;
        font-size: 14px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://epzsfnhjjeafwhzbotyv.supabase.co/storage/v1/object/sign/ia42-objects/lx-objects/images/logoia42b.png?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InN0b3JhZ2UtdXJsLXNpZ25pbmcta2V5X2Q5MmQ5YjJhLWZiZGMtNDdhOC05NTUxLTkxODNkYTA3YmVlMSJ9.eyJ1cmwiOiJpYTQyLW9iamVjdHMvbHgtb2JqZWN0cy9pbWFnZXMvbG9nb2lhNDJiLnBuZyIsImlhdCI6MTc0ODExMjM4MiwiZXhwIjoxODA1NjU0NzgyfQ.gCB3Vx08w13PeDmSwCOEU6trN4uFgvUYZHfhjYlZKs8" alt="IA42 Logo">
    </div>
    <h2>¡Bienvenido a IA42!</h2>
    <p>Hola ${name ? name + ',' : ''}</p>
    <p>Gracias por registrarte en nuestra plataforma. Estamos emocionados de acompañarte en tu camino de aprendizaje con IA.</p>
    <p>Para activar tu cuenta, confirma tu correo electrónico haciendo clic en el botón:</p>
    <p style="text-align: center;">
      <a href="${confirmationUrl}" class="button">Confirmar mi correo</a>
    </p>
    <p>Si no has creado esta cuenta, puedes ignorar este mensaje.</p>
    <p style="font-size: 12px; color: #9DA3AE; margin-top: 20px;">
      Este enlace expira en 24 horas por seguridad.
    </p>
    <div class="footer">
      &copy; 2025 IA42 · Todos los derechos reservados
    </div>
  </div>
</body>
</html>
            `
        };

        const result = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        return { success: false, message: error.message };
    }
}

async sendPasswordResetEmail(email, token, name = '') {
    if (!this.transporter) {
        return { success: false, message: 'Servicio de email no configurado' };
    }

    try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/app?reset=${token}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@ia42.com',
            to: email,
            subject: '🔐 Recupera tu contraseña - IA42',
            html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperar Contraseña - IA42</title>
    <style>
        /* Reset CSS */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #334155;
            background: #f8fafc;
            margin: 0;
            padding: 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 50%, #7f1d1d 100%);
            padding: 40px 30px;
            text-align: center;
            color: #ffffff;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255,215,0,0.1) 0%, rgba(250,129,12,0.1) 100%);
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .logo {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .security-icon {
            width: 50px;
            height: 50px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #FFD700;
            font-size: 24px;
            border: 2px solid rgba(255,255,255,0.3);
        }
        
        .tagline {
            font-size: 1.1rem;
            opacity: 0.9;
            font-weight: 500;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .alert-banner {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #fcd34d;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
            border-left: 4px solid #f59e0b;
        }
        
        .alert-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .alert-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .alert-text {
            color: #b45309;
            font-weight: 500;
        }
        
        .main-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: #1e293b;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .greeting {
            font-size: 1.1rem;
            color: #475569;
            margin-bottom: 20px;
        }
        
        .description {
            color: #64748b;
            margin-bottom: 20px;
            font-size: 1rem;
        }
        
        .security-info {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            border-left: 4px solid #0ea5e9;
        }
        
        .security-info-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: 10px;
        }
        
        .security-steps {
            list-style: none;
            padding: 0;
        }
        
        .security-steps li {
            color: #075985;
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        }
        
        .security-steps li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #0ea5e9;
            font-weight: bold;
        }
        
        .cta-section {
            text-align: center;
            margin: 40px 0;
            padding: 30px 20px;
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-radius: 12px;
            border: 1px solid #fecaca;
        }
        
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: #000000 !important;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 1.1rem;
            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
            transition: all 0.3s ease;
            border: none;
            cursor: pointer;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(220, 38, 38, 0.4);
        }
        
        .alternative-link {
            margin-top: 25px;
            padding: 20px;
            background: #f1f5f9;
            border-radius: 8px;
            border-left: 4px solid #dc2626;
        }
        
        .alternative-title {
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
        }
        
        .alternative-url {
            word-break: break-all;
            color: #64748b;
            font-size: 0.9rem;
            font-family: 'Courier New', monospace;
            background: #ffffff;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .warning-section {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            border-left: 4px solid #dc2626;
        }
        
        .warning-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #991b1b;
            margin-bottom: 10px;
        }
        
        .warning-text {
            color: #b91c1c;
            font-size: 0.95rem;
        }
        
        .footer {
            background: #1e293b;
            color: #94a3b8;
            padding: 30px;
            text-align: center;
        }
        
        .footer-title {
            color: #FFD700;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .expiry-notice {
            background: #fed7d7;
            color: #c53030;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border: 1px solid #fc8181;
            text-align: center;
            font-weight: 600;
        }
        
        .help-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 20px;
            margin-top: 25px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        
        .help-title {
            font-weight: 600;
            color: #334155;
            margin-bottom: 8px;
        }
        
        .help-text {
            color: #64748b;
            font-size: 0.9rem;
        }
        
        /* Mobile Responsive */
        @media (max-width: 600px) {
            body { padding: 10px; }
            .email-container { border-radius: 12px; }
            .header, .content { padding: 25px 20px; }
            .main-title { font-size: 1.5rem; }
            .cta-button { padding: 14px 24px; font-size: 1rem; }
            .logo { font-size: 1.75rem; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header de seguridad -->
        <div class="header">
            <div class="header-content">
                <div class="logo">
                    <div class="security-icon">🔐</div>
                    IA42
                </div>
                <div class="tagline">Solicitud de Recuperación de Contraseña</div>
            </div>
        </div>
        
        <!-- Contenido principal -->
        <div class="content">
            <!-- Alerta de seguridad -->
            <div class="alert-banner">
                <div class="alert-icon">⚠️</div>
                <div class="alert-title">Solicitud de Recuperación</div>
                <div class="alert-text">Se solicitó restablecer la contraseña de tu cuenta</div>
            </div>
            
            <h1 class="main-title">Recuperar Contraseña</h1>
            
            <p class="greeting">Hola ${name || 'usuario'} 👋</p>
            
            <p class="description">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en IA42. 
                Si fuiste tú quien hizo esta solicitud, puedes crear una nueva contraseña segura 
                haciendo clic en el botón de abajo.
            </p>
            
            <!-- Información de seguridad -->
            <div class="security-info">
                <div class="security-info-title">
                    🛡️ Información de Seguridad
                </div>
                <ul class="security-steps">
                    <li>Este enlace es único y solo funciona una vez</li>
                    <li>Expira automáticamente en 1 hora</li>
                    <li>Solo funciona para la cuenta: <strong>${email}</strong></li>
                    <li>Tu contraseña actual sigue siendo válida hasta que la cambies</li>
                </ul>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-section">
                <p style="margin-bottom: 20px; color: #475569; font-weight: 500;">
                    Para crear tu nueva contraseña:
                </p>
                
                <a href="${resetUrl}" class="cta-button">
                    🔑 Restablecer Mi Contraseña
                </a>
            </div>
            
            <!-- Enlace alternativo -->
            <div class="alternative-link">
                <div class="alternative-title">¿No funciona el botón?</div>
                <div class="alternative-url">${resetUrl}</div>
            </div>
            
            <!-- Aviso de expiración -->
            <div class="expiry-notice">
                ⏰ Este enlace expira en 1 hora por seguridad
            </div>
            
            <!-- Sección de advertencia -->
            <div class="warning-section">
                <div class="warning-title">
                    🚨 ¿No solicitaste esto?
                </div>
                <div class="warning-text">
                    Si no solicitaste restablecer tu contraseña, puedes ignorar este email de forma segura. 
                    Tu cuenta permanece protegida y no se realizarán cambios.
                </div>
            </div>
            
            <!-- Ayuda -->
            <div class="help-section">
                <div class="help-title">¿Necesitas ayuda?</div>
                <div class="help-text">
                    Si tienes problemas o preguntas sobre tu cuenta, 
                    contáctanos respondiendo a este email.
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-title">IA42 Security Team</div>
            <div>Protegiendo tu cuenta y datos educativos</div>
            <div style="margin-top: 10px; font-size: 0.85rem;">
                © 2025 IA42 - Todos los derechos reservados
            </div>
        </div>
    </div>
</body>
</html>
            `
        };

        const result = await this.transporter.sendMail(mailOptions);
        //console.log('✅ Email de recuperación enviado:', email);
        return { success: true, messageId: result.messageId };

    } catch (error) {
        //console.erroror('❌ Error enviando email de recuperación:', error.message);
        return { success: false, message: error.message };
    }
}



    // Método de prueba
    async testConnection() {
        if (!this.transporter) {
            return { success: false, message: 'Transporter no inicializado' };
        }

        try {
            await this.transporter.verify();
            return { success: true, message: 'Conexión SMTP exitosa' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

// Exportar instancia singleton
const emailService = new EmailService();
module.exports = emailService;
