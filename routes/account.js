import express from 'express';
import bcrypt from 'bcrypt';
const router = express.Router();
import { getDb } from '../config/db.js';
import { 
    findUserById,
    updateUsername,
    findUserByUsername,
    getUserIdFromSession,  
    deleteUserById, 
    validatePassword } from '../models/User.js'; // Modelleri çağır

router.get('/getUserId', (req, res) => {
    if (req.session && req.session.userId) {
        return res.json({ userId: req.session.userId });
    } else {
        return res.status(404).json({ userId: null });
    }
});

// Kullanıcı adı güncelleme
router.put('/update-username', async (req, res) => {
    const { newUsername } = req.body;
    const session = req.session;

    if (!newUsername) {
        return res.status(400).json({ success: false, message: 'Kullanıcı adı boş olamaz.' });
    }

    try {
        const userId = await getUserIdFromSession(session); // Oturumdan kullanıcı ID'sini al

        const result = await updateUsername(userId, newUsername); // Kullanıcı adı güncelle
        if (result.success) {
            req.session.username = newUsername; // Oturumdaki kullanıcı adı güncellenir
            return res.json(result); // Başarı mesajı döndür
        } else {
            return res.status(400).json(result); // Hata mesajı döndür
        }
    } catch (error) {
        console.error('Kullanıcı adı güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası. Lütfen tekrar deneyin.' });
    }
});

// Şifre güncelleme işlemi (PUT)
router.put('/update-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    try {
        const username = req.session.username; // Oturumdaki kullanıcı adı

        if (!username) {
            return res.status(400).json({ success: false, message: 'Oturum açılmamış.' });
        }

        // Kullanıcıyı veritabanından al
        const user = await findUserByUsername(username);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const currentPassword = user.password;

        // Eski şifreyi doğrula
        const match = await validatePassword(oldPassword, currentPassword);
        if (!match) {
            return res.status(400).json({ success: false, message: 'Eski şifre yanlış.' });
        }

        // Yeni şifreyi hashle
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Yeni şifreyi veritabanında güncelle
        const db = await getDb();
        await db.execute('UPDATE users SET password = ? WHERE username = ?', [hashedNewPassword, username]);

        res.json({ success: true, message: 'Şifre başarıyla güncellendi.' });
    } catch (error) {
        console.error('Şifre güncellenirken hata oluştu:', error);
        res.status(500).json({ success: false, message: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
    }
});


// Hesap silme endpoint'i
router.delete('/delete-account', async (req, res) => {
    const { userId, password } = req.body;
    const sessionUserId = req.session.userId;

    if (!userId || !password) {
        return res.status(400).json({ success: false, message: 'Kullanıcı ID veya şifre eksik.' });
    }
    if (!sessionUserId || sessionUserId !== userId) {
        return res.status(403).json({ success: false, message: 'Geçersiz kullanıcı ID.' });
    }


    try {
        const db = await getDb();
        const user = await findUserById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
        }

        const isValidPassword = await validatePassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Şifre hatalı.' });
        }

        const isDeleted = await deleteUserById(userId);
        if (isDeleted) {
            req.session.destroy(); // Oturumu sonlandır
            return res.status(200).json({ success: true, message: 'Hesap başarıyla silindi.' });
        } else {
            return res.status(500).json({ success: false, message: 'Hesap silinemedi.' });
        }
    } catch (err) {
        console.error('Hesap silme hatası:', err);
        res.status(500).json({ success: false, message: 'Sunucu hatası.' });
    }
});

export default router; // Default export
