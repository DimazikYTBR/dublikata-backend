const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post('/donation-webhook', async (req, res) => {
    try {
        const userEmail = req.body.username?.trim(); 
        const amount = req.body.amount;

        if (!userEmail) {
            return res.status(400).send('Email не указан в поле имени');
        }

        console.log(`Прилетел донат от ${userEmail} на сумму ${amount}`);

        const { data: existingSub, error: subFetchError } = await supabase
            .from('subscriptions')
            .select('expires_at, status')
            .eq('user_id', user.id)
            .maybeSingle();

        let expiresAt = new Date();

        if (existingSub && existingSub.status === 'active' && existingSub.expires_at) {
            const currentExpires = new Date(existingSub.expires_at);
            currentExpires.setDate(currentExpires.getDate() + 30);
            expiresAt = currentExpires;
            console.log(`Подписка продлена. Новая дата: ${expiresAt.toISOString()}`);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 30);
            console.log(`Новая подписка создана на 30 дней.`);
        }

        // 3. Сохраняем или обновляем запись в базе
        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                status: 'active',
                amount_paid: amount,
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'user_id' });

        if (subError) {
            console.error('Ошибка активации подписки:', subError);
            return res.status(500).send('Ошибка базы данных');
        }

        console.log(`Подписка для ${userEmail} успешно активирована!`);
        return res.status(200).send('OK');

    } catch (err) {
        console.error('Критическая ошибка сервера:', err);
        return res.status(500).send('Internal Server Error');
    }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер Dublikata Studio запущен на порту ${PORT}`);
});