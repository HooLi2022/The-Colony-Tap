const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

// Настройки CORS - разрешаем запросы только с вашего домена
app.use(cors({
    origin: ['https://colony-tap.ru', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Конфигурация ЮKassa - ЗАМЕНИТЕ НА СВОИ ДАННЫЕ
const YOOKASSA_CONFIG = {
    shopId: 'ваш_идентификатор_магазина', // Из личного кабинета ЮKassa
    secretKey: 'ваш_секретный_ключ', // Из личного кабинета ЮKassa
    returnUrl: 'https://colony-tap.ru/payment-success.html' // URL страницы успеха
};

// Создание платежа
app.post('/api/create-payment', async (req, res) => {
    try {
        const { amount, description, userId, clicks, username } = req.body;
        
        // Генерация ключа идемпотентности
        const idempotenceKey = crypto.randomUUID();
        
        // Создание Basic Auth
        const auth = Buffer.from(`${YOOKASSA_CONFIG.shopId}:${YOOKASSA_CONFIG.secretKey}`).toString('base64');
        
        console.log('Создание платежа:', { amount, userId, clicks, username });
        
        // Запрос к ЮKassa
        const response = await axios.post('https://api.yookassa.ru/v3/payments', {
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            capture: true,
            confirmation: {
                type: 'embedded'
            },
            description: description || `Покупка ${clicks} кликов`,
            metadata: {
                userId: userId,
                clicks: clicks,
                username: username
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Idempotence-Key': idempotenceKey,
                'Authorization': `Basic ${auth}`
            }
        });
        
        console.log('Платеж создан:', response.data.id);
        
        res.json({
            success: true,
            paymentId: response.data.id,
            confirmationToken: response.data.confirmation.confirmation_token,
            status: response.data.status
        });
        
    } catch (error) {
        console.error('Ошибка создания платежа:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.description || 'Ошибка создания платежа'
        });
    }
});

// Проверка статуса платежа
app.get('/api/check-payment/:paymentId', async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const auth = Buffer.from(`${YOOKASSA_CONFIG.shopId}:${YOOKASSA_CONFIG.secretKey}`).toString('base64');
        
        const response = await axios.get(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        
        res.json({
            success: true,
            status: response.data.status,
            payment: response.data
        });
        
    } catch (error) {
        console.error('Ошибка проверки платежа:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: error.response?.data?.description || 'Ошибка проверки платежа'
        });
    }
});

// Webhook для уведомлений от ЮKassa
app.post('/api/webhook', async (req, res) => {
    try {
        const event = req.body;
        
        console.log('Получен webhook:', event.event);
        
        if (event.event === 'payment.succeeded') {
            const payment = event.object;
            const { userId, clicks, username } = payment.metadata;
            
            console.log(`✅ Платеж успешен: ${payment.id}, пользователь: ${username} (${userId}), клики: ${clicks}`);
            
            // Здесь нужно обновить Firebase
            // Для этого нужно добавить Firebase Admin SDK
            
            // Пример с Firebase Admin (раскомментируйте когда установите firebase-admin)
            /*
            const admin = require('firebase-admin');
            
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: 'your-project-id',
                        clientEmail: 'your-client-email',
                        privateKey: 'your-private-key'
                    }),
                    databaseURL: 'https://your-project.firebaseio.com'
                });
            }
            
            const db = admin.database();
            
            // Обновляем глобальный счет
            await db.ref('globalCounter').transaction(v => (v || 0) + parseInt(clicks));
            
            // Обновляем счет игрока
            await db.ref('players/' + userId).transaction(p => {
                if (!p) p = { sc: 0 };
                p.sc = (p.sc || 0) + parseInt(clicks);
                return p;
            });
            */
        }
        
        res.sendStatus(200);
        
    } catch (error) {
        console.error('Ошибка обработки webhook:', error);
        res.sendStatus(500);
    }
});

// Проверка работы сервера
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📍 URL для API: http://localhost:${PORT}/api`);
});
