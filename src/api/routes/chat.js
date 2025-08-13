const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
    res.json({
        message: '✅ Ruta de chat funcionando',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;