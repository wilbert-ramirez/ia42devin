const { pool } = require('../../config/database');

const createSampleData = async () => {
    try {
        console.log('🌱 Creando datos de ejemplo...');
        
        // Crear método de pago
        await pool.query(`
            INSERT INTO paymentmethod (name, description) 
            VALUES ('Tarjeta de Crédito', 'Pago con tarjeta de crédito o débito')
            ON CONFLICT DO NOTHING
        `);
        
        // Crear precio
        const priceResult = await pool.query(`
            INSERT INTO lxprice (id_payment_method, amount, discount, status, startdate) 
            VALUES (1, 50.00, 0, 'active', CURRENT_DATE) 
            RETURNING id_price
        `);
        
        // Crear un curso de ejemplo
        await pool.query(`
            INSERT INTO lx (shortname, description, id_category, imagepath, status, id_price, standout) 
            VALUES (
                'intro-ia', 
                'Curso introductorio de Inteligencia Artificial', 
                1, 
                '/images/intro-ia.jpg', 
                'active', 
                $1, 
                true
            )
        `, [priceResult.rows[0].id_price]);
        
        console.log('✅ Datos de ejemplo creados exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createSampleData();