import express from 'express';
import { getDb } from '../config/db.js';
const router = express.Router();

// Ana Sayfa
router.get('/', async (req, res) => {
    try {
        if (req.session.username) {
            res.redirect('/home');
        } else {
            res.render('login', { username: null });
        }
    } catch (err) {
        console.error('Ana sayfaya erişilirken hata oluştu:', err);
        res.status(500).send('Sunucu hatası.');
    }
});

// Kullanıcı Kayıt Sayfası (GET isteği ile)
router.get('/signup', (req, res) => {
    try {
        
        res.render('signup', { errorMessage: null, username: null }); // Kayıt sayfasını render ediyoruz
    } catch (err) {
        console.error('Kayıt sayfası yüklenirken hata oluştu:', err);
        res.status(500).send('Bir hata oluştu.');
    }
});

// Ana Sayfa Route'u
router.get('/home', (req, res) => {
    try {
        if (req.session.username) {
            res.render('home', { username: req.session.username });
        } else {
            res.redirect('/');
        }
    } catch (err) {
        console.error('Ana sayfa yüklenirken hata oluştu:', err);
        res.status(500).send('Sunucu hatası.');
    }
});

// Günlüklerim
router.get('/my-journals', async (req, res) => {
    const username = req.session.username;

    if (!username) {
        return res.redirect('/login'); // Kullanıcı girişi yapılmadıysa, giriş sayfasına yönlendir
    }

    try {
        const db = await getDb();
        // Kullanıcıyı veritabanından kontrol et
        const [userResults] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);

        if (userResults.length === 0) {
            return res.status(404).send('Kullanıcı bulunamadı.');
        }

        // Günlükleri al
        const userId = userResults[0].id;
        const [results] = await db.execute('SELECT id, content, created_at FROM diaries WHERE user_id = ? ORDER BY created_at DESC', [userId]);

        res.render('my-journals', { entries: results });

    } catch (err) {
        console.error('Günlükler alınırken hata oluştu:', err);
        res.status(500).send('Bir hata oluştu.');
    }
});

// Ayarlar Route'u
router.get('/settings', (req, res) => {
    try {
        
        if (req.session.username) {
            res.render('settings', { username: req.session.username });
        } else {
            res.redirect('/'); // Oturum yoksa giriş sayfasına yönlendirin
        }
    } catch (err) {
        console.error('Ayarlar sayfası yüklenirken hata oluştu:', err);
        res.status(500).send('Sunucu hatası.');
    }
});


// Çıkış Yapma
router.get('/logout', (req, res) => {
    try {
        
        // Oturumu sonlandırıyoruz
        req.session.destroy((err) => {
            if (err) {
                console.error('Çıkış yaparken hata oluştu:', err);
                res.status(500).send('Bir hata oluştu.');
            } else {
                // Oturum sonlandırıldıktan sonra anasayfaya yönlendiriyoruz
                res.redirect('/');  // Anasayfa (veya login sayfasına)
            }
        });
    } catch (err) {
        console.error('Çıkış işlemi sırasında hata oluştu:', err);
        res.status(500).send('Bir hata oluştu.');
    }
});

export default router;