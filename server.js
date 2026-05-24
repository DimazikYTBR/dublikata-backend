const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.post('/donation-webhook', async (req, res) => {
    try {
        const userEmail = req.body.username?.trim(); 
        const amount = req.body.amount;

        console.log(`[Входящий вебхук] Имя/Email: ${userEmail}, Сумма: ${amount}`);

        if (!userEmail) {
            console.log('Ошибка: Поле username пустое');
            return res.status(400).send('Email не указан в поле имени');
        }

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('mail', userEmail)
            .maybeSingle();

        if (userError) {
            console.error('Ошибка поиска юзера в базе:', userError);
            return res.status(500).send('Ошибка БД при поиске юзера');
        }

        if (!user) {
            console.log(`Пользователь с почтой ${userEmail} не найден в таблице users!`);
            return res.status(404).send('Пользователь не найден');
        }

        console.log(`Пользователь найден! ID: ${user.id}. Проверяем подписку...`);

        const { data: existingSub, error: subFetchError } = await supabase
            .from('subscriptions')
            .select('expires_at, status')
            .eq('user_id', user.id)
            .maybeSingle();

        if (subFetchError) {
            console.error('Ошибка получения подписки:', subFetchError);
            return res.status(500).send('Ошибка БД при проверке подписки');
        }

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

        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: user.id,
                status: 'active',
                amount_paid: amount,
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'user_id' });

        if (subError) {
            console.error('Ошибка сохранения подписки в БД:', subError);
            return res.status(500).send('Ошибка базы данных при записи');
        }

        console.log(` ПОБЕДА! Подписка для ${userEmail} успешно активирована!`);
        return res.status(200).send('OK');

    } catch (err) {
        console.error('Критическая ошибка сервера:', err);
        return res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Сервер Dublikata Studio запущен на порту ${PORT}`);
});