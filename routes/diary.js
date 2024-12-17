import express from 'express';
const router = express.Router();
import { getDb } from '../config/db.js';
import { 
    getUserIdFromSession } from '../models/User.js';


// Günlük Ekleme
router.post('/add-entry', async (req, res) => {
    const { content } = req.body;
    const username = req.session.username;

    if (!username) {
        return res.status(401).send('Giriş yapmanız gerekiyor.');
    }

    // İçeriğin boş olup olmadığını kontrol et
    if (!content || content.trim() === '') {
        return res.render('home', { errorMessage: 'Günlük içeriği boş olamaz.', username });
    }

    try {
        const contentToSave = content.trim() === '' ? null : content.trim();
        
        // Kullanıcı id'sini session'dan almak için fonksiyon
        const userId = await getUserIdFromSession(req.session);

        const db = await getDb();
        // Kullanıcı bilgilerini veritabanından al
        const [userResults] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (userResults.length === 0) {
            return res.status(400).send('Kullanıcı bulunamadı.');
        }

        // Veritabanına ekleme işlemi
        await db.execute('INSERT INTO diaries (user_id, username, content) VALUES (?, ?, ?)', [
            userId, username, contentToSave
        ]);

        res.render('home', { 
            username: username, 
            successMessage: 'Günlük başarıyla kaydedildi!' 
        });
    } catch (err) {
        console.error('Günlük eklenirken hata oluştu:', err);
        res.status(500).send('Bir hata oluştu.');
    }
});

// Günlük Güncelleme
router.put('/update-entry/:id', async (req, res) => {
    const entryId = req.params.id;
    const { content } = req.body;

    // İçeriğin boş olup olmadığını kontrol et
    if (!content || content.trim() === '') {
        return res.status(400).send({ message: 'Günlük içeriği boş olamaz.' });
    }

    try {
        const db = await getDb();
        const [result] = await db.execute('UPDATE diaries SET content = ? WHERE id = ?', [content, entryId]);

        if (result.affectedRows > 0) {
            res.status(200).send({ message: 'Günlük başarıyla güncellendi.' });
        } else {
            res.status(404).send({ message: 'Günlük bulunamadı.' });
        }
    } catch (err) {
        console.error('Günlük güncellenirken hata oluştu:', err);
        res.status(500).send({ message: 'Sunucu hatası.' });
    }
});

// Günlük Silme
router.delete('/delete-entry/:id', async (req, res) => {
    const entryId = req.params.id;
    try {
        const db = await getDb();
        const [result] = await db.execute('DELETE FROM diaries WHERE id = ?', [entryId]);
        if (result.affectedRows > 0) {
            res.status(200).send({ message: 'Günlük başarıyla silindi.' });
        } else {
            res.status(404).send({ message: 'Günlük bulunamadı.' });
        }
    } catch (err) {
        console.error('Günlük silinirken hata oluştu:', err);        
        res.status(500).send('Sunucu hatası.');
    }
});
export default router; 