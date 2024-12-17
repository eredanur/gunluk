import express from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import bcrypt from 'bcrypt';
import ejs from 'ejs';
import cors from 'cors';
import { getDb } from './config/db.js';
import accountRoutes from './routes/account.js'; // Yeni rota dosyası
import diaryRoutes from './routes/diary.js';
import authRoutes from './routes/auth.js';

const app = express();
const port = 3012;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json()); // JSON verisini almak için
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: false,
}));
app.set('view engine', 'ejs');

// Static dosyalar
app.use(express.static('public'));

// Routes

app.use(authRoutes);

// Kullanıcı Girişi
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const db = await getDb();
        const [user] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (user.length === 0) {
            return res.render('login', { errorMessage: 'Kullanıcı adı veya şifre hatalı', username });
        }

        const isValidPassword = await bcrypt.compare(password, user[0].password);

        if (!isValidPassword) {
            return res.render('login', { errorMessage: 'Kullanıcı adı veya şifre hatalı', username });
        }

        // Kullanıcıyı session'a kaydet
        req.session.username = username;
        req.session.userId = user[0].id;


        res.redirect('/home');
    } catch (err) {
        console.error('Giriş hatası:', err);
        res.status(500).send('Bir hata oluştu.');
    }
});

// Günlük işlemleri
app.use(diaryRoutes);

// Kullanıcı adı kontrolü için route
app.get('/check-username', async (req, res) => {
    const { username } = req.query;

    if (!username || username.trim() === '') {
        return res.status(400).json({ available: false, message: 'Kullanıcı adı boş olamaz.' });
    }

    try {
        const db = await getDb();
        const [result] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);

        if (result.length > 0) {
            res.json({ available: false, message: 'Bu kullanıcı adı alınmış.' });
        } else {
            res.json({ available: true, message: 'Bu kullanıcı adı uygun.' });
        }
    } catch (error) {
        console.error('Kullanıcı adı kontrol hatası:', error);
        res.status(500).json({ available: false, message: 'Sunucu hatası.' });
    }
});

// Route'ları Bağlama
app.use(accountRoutes); // Tüm account ile ilgili endpoint'leri bağlar

// Kullanıcı Kayıt İşlemi (POST isteği ile)
app.post('/signup', async (req, res) => {
    const { username, password, confirmPassword } = req.body;
    try {
        const db = await getDb();
        if (password !== confirmPassword) {
            return res.render('signup', { errorMessage: 'Şifreler eşleşmiyor!', username });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [results] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (results.length > 0) {
            return res.render('signup', { errorMessage: 'Bu kullanıcı adı zaten mevcut!', username });
        }
        await db.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        req.session.username = username;
        res.redirect('/home');
    } catch (err) {
        console.error('Kayıt yapılırken hata oluştu:', err);
        res.status(500).send('Bir hata oluştu.');
    }
});

app.listen(port, () => {
    console.log(`Uygulama http://localhost:${port} adresinde çalışıyor.`);
});
