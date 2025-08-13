require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { testConnection } = require('../../config/database');

// Importar rutas
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const contactRoutes = require('./routes/contact');
const inscriptionRoutes = require('./routes/inscriptions');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const paymentsRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// TEMPORAL: Test de auth routes
//console.log('🔍 Testing auth routes import...');
try {
    const authTest = require('./routes/auth');
    //console.log('✅ Auth routes loaded successfully');
    //console.log('✅ Auth routes type:', typeof authTest);
    //console.log('✅ Auth routes stack length:', authTest.stack?.length || 'N/A');
} catch (error) {
    //console.erroror('❌ Error loading auth routes:', error.message);
    //console.erroror('❌ Full error:', error);
}


// ==============================================
// MIDDLEWARES GLOBALES
// ==============================================

// Seguridad
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdnjs.cloudflare.com",
        "https://www.paypal.com",
        "https://js.onvopay.com",
        "https://sdk.onvopay.com",
        "https://unpkg.com"
      ],
      scriptSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdnjs.cloudflare.com",
        "https://www.paypal.com",
        "https://js.onvopay.com",
        "https://sdk.onvopay.com",
        "https://unpkg.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdnjs.cloudflare.com",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com",
        "https://n8n.ia42.com",
        "https://n8n.srv806164.hstgr.cloud",
        "https://n8n.srv806164.hstgr.cloud:5678"
      ],
      frameSrc: [
        "'self'",
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com",
        "https://sdk.onvopay.com" // ✅ AÑADIDO
      ]
    }
  }
}));


// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://tu-dominio.com'] // Reemplaza con tu dominio de producción
        : ['http://localhost:3000', 'http://localhost:3001'], // Permite localhost para desarrollo
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================
// ARCHIVOS ESTÁTICOS - PRIORIDAD MÁXIMA
// ==============================================

// Servir archivos estáticos del frontend con la ruta /app
// Todo el contenido de '../frontend' estará disponible bajo '/app'
// Ej: '../frontend/index.html' -> '/app/index.html'
// Ej: '../frontend/assets/css/styles.css' -> '/app/assets/css/styles.css'
app.use('/app', express.static(path.join(__dirname, '../frontend'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true
}));

// ==============================================
// HEALTH CHECK - ANTES DE OTRAS RUTAS
// ==============================================

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
    });
});

// ==============================================
// RUTAS DE API - ANTES DE PÁGINAS
// ==============================================

app.use(`/api/${API_VERSION}/auth`, (req, res, next) => {
    //console.log(`🔥 AUTH REQUEST: ${req.method} ${req.path}`);
    next();
}, authRoutes);

app.use(`/api/${API_VERSION}/students`, studentRoutes);
app.use(`/api/${API_VERSION}/courses`, courseRoutes);
app.use(`/api/${API_VERSION}/inscriptions`, inscriptionRoutes);
app.use(`/api/${API_VERSION}/chat`, chatRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/contact`, contactRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentsRoutes);

// Debug: Mostrar rutas registradas
//console.log('🔍 Rutas AUTH registradas:');
authRoutes.stack?.forEach((layer, i) => {
    if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        //console.log(`  ${i + 1}. ${methods.join(',').toUpperCase()} ${layer.route.path}`);
    }
});

// ==============================================
// RUTAS DE PÁGINAS HTML - DESPUÉS DE API
// ==============================================

// Redirigir la raíz del sitio a la aplicación principal bajo /app
app.get('/', (req, res) => {
    res.redirect('/app/'); // Redirige a /app/, que servirá index.html por defecto
});

// Rutas específicas para archivos HTML bajo /app si se solicitan directamente.
// express.static ya maneja esto, pero estas rutas explícitas pueden ser útiles
// para claridad o si necesitas lógica específica antes de servir el archivo.
// Si express.static está configurado correctamente, estas podrían no ser estrictamente necesarias.
app.get('/app/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
app.get('/app/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});
app.get('/app/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});
app.get('/app/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});
// Añade más rutas explícitas para otros HTML si es necesario (ej. courses.html, privacy.html)

// Ruta catch-all para SPA behavior en /app/*
// Si se accede a /app/cualquier-cosa que no es un archivo estático servido por express.static,
// servir index.html. Esto es útil para SPAs o para manejar rutas de frontend.
app.get('/app/*', (req, res) => {
    // No es necesario verificar extensiones aquí si express.static ya manejó los archivos existentes.
    // Si la solicitud llega aquí, es porque no es un archivo estático conocido bajo /app.
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ==============================================
// MANEJO DE ERRORES
// ==============================================

// 404 Handler para rutas de API no encontradas
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint de API no encontrado',
        message: `La ruta ${req.originalUrl} no existe`,
        availableEndpoints: [
            '/health',
            `/api/${API_VERSION}/auth`,
            `/api/${API_VERSION}/students`,
            `/api/${API_VERSION}/courses`,
            `/api/${API_VERSION}/inscriptions`,
            `/api/${API_VERSION}/chat`,
            `/api/${API_VERSION}/admin`,
            `/api/${API_VERSION}/contact`,
            `/api/${API_VERSION}/payments`
        ]
    });
});

// 404 Handler general para rutas que no son /api/* y no fueron servidas por /app
// Si una solicitud llega aquí, significa que no coincidió con ninguna ruta de API,
// ni con los archivos estáticos servidos por app.use('/app', ...),
// ni con el catch-all app.get('/app/*', ...).
app.use('*', (req, res) => {
    res.status(404).send('Recurso no encontrado o ruta no válida.');
});

// Error Handler Global
app.use((error, req, res, next) => {
    //console.erroror('❌ Error no manejado:', error);
    
    // Error de validación de Joi
    if (error.isJoi) {
        return res.status(400).json({
            error: 'Error de validación',
            details: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }))
        });
    }
    
    // Error de base de datos (ejemplo genérico)
    if (error.code && (typeof error.code === 'string' && error.code.startsWith('ER_'))) { // Asumiendo códigos de error SQL
        return res.status(500).json({
            error: 'Error de base de datos',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor al procesar la solicitud.'
        });
    }
    
    // Error genérico
    res.status(error.status || 500).json({
        error: error.message || 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    });
});

// ==============================================
// INICIALIZACIÓN DEL SERVIDOR
// ==============================================

const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        //console.log('🔗 Probando conexión a la base de datos...');
        const dbConnected = await testConnection();
        
        if (!dbConnected) {
            //console.erroror('❌ No se pudo conectar a la base de datos. El servidor no se iniciará.');
            process.exit(1);
        }
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`
🚀 Servidor IA42 iniciado exitosamente!

📊 Información del servidor:
   • Puerto: ${PORT}
   • Entorno: ${process.env.NODE_ENV}
   • API Version: ${API_VERSION}
   • PID: ${process.pid}

🔗 URLs disponibles:
   • Aplicación: http://localhost:${PORT}/app/  (o http://localhost:${PORT}/ que redirige aquí)
   • API Base: http://localhost:${PORT}/api/${API_VERSION}
   • Health Check: http://localhost:${PORT}/health

💾 Base de datos: ✅ Conectada

📁 Archivos estáticos servidos desde '${path.join(__dirname, '../frontend')}' bajo la ruta '/app'.
   Ej: http://localhost:${PORT}/app/index.html
       http://localhost:${PORT}/app/assets/css/styles.css
            `);
        });
        
    } catch (error) {
        //console.erroror('❌ Error fatal al iniciar el servidor:', error);
        process.exit(1);
    }
};

// Manejo de cierre graceful
process.on('SIGINT', () => {
    //console.log('\n🛑 Servidor cerrándose (SIGINT)...');
    // Aquí podrías añadir lógica para cerrar conexiones a DB, etc.
    process.exit(0);
});

process.on('SIGTERM', () => {
    //console.log('\n🛑 Servidor cerrándose (SIGTERM)...');
    // Aquí podrías añadir lógica para cerrar conexiones a DB, etc.
    process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    //console.erroror('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Considera cerrar el proceso de forma controlada en producción para evitar estados inconsistentes.
    // process.exit(1); 
});

process.on('uncaughtException', (error) => {
    //console.erroror('❌ Uncaught Exception:', error);
    // Es crítico cerrar el proceso aquí, ya que el estado de la aplicación es desconocido.
    process.exit(1); 
});

// Iniciar el servidor
startServer();

module.exports = app; // Exportar app para posibles pruebas
