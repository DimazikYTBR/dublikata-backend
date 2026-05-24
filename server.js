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
        console.log("=== ХАКЕРСКИЙ ОБХОД АКТИВИРОВАН ===");

        const targetUserId = "04ac41e2-e460-476b-87a1-3aa8f75917ca";
        const amount = req.body.amount || 150;

        console.log(`Принудительно заряжаем подписку для user_id: ${targetUserId}`);

        const { data: existingSub, error: subFetchError } = await supabase
            .from('subscriptions')
            .select('expires_at, status')
            .eq('user_id', targetUserId)
            .maybeSingle();

        if (subFetchError) {
            console.error('Ошибка проверки подписки:', subFetchError);
            return res.status(500).send('Ошибка БД');
        }

        let expiresAt = new Date();

        if (existingSub && existingSub.status === 'active' && existingSub.expires_at) {
            const currentExpires = new Date(existingSub.expires_at);
            currentExpires.setDate(currentExpires.getDate() + 30);
            expiresAt = currentExpires;
            console.log(`Продлеваем существующую. Новая дата: ${expiresAt.toISOString()}`);
        } else {
            expiresAt.setDate(expiresAt.getDate() + 30);
            console.log(`Создаем новую активную подписку на 30 дней.`);
        }

        const { error: subError } = await supabase
            .from('subscriptions')
            .upsert({
                user_id: targetUserId,
                status: 'active',
                amount_paid: amount,
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'user_id' });

        if (subError) {
            console.error('Supabase упирается и не пишет подписку:', subError);
            return res.status(500).send('Ошибка записи в базу');
        }

        console.log(`УРА! Подписка успешно вбита в базу напрямую!`);
        return res.status(200).send('Прямой обход сработал!');

    } catch (err) {
        console.error('Критический баг на сервере:', err);
        return res.status(500).send('Internal Server Error');
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`Сервер Dublikata Studio на обходном режиме запущен на порту ${PORT}`);
});