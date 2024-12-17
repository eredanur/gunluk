// models/User.js
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { getDb } from '../config/db.js';

// Gmail üzerinden e-posta göndermek için bir transporter oluşturun
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com', // Gmail adresiniz
        pass: 'your-app-password'    // Gmail uygulama şifreniz
    }
});

// Kullanıcıyı ID ile bulma
async function findUserById(userId) {
    const db = await getDb();
    const [user] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);
    return user.length > 0 ? user[0] : null;
}

// Kullanıcıyı kullanıcı adı ile bulma
async function findUserByUsername(username) {
    const db = await getDb();
    const [user] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    return user.length > 0 ? user[0] : null;
}

async function getUserIdFromSession(session) {
    if (session && session.userId) {
        // Eğer `userId` oturumda varsa, doğrudan dön
        return session.userId;
    }

    // `userId` oturumda yoksa, `username` üzerinden veritabanını kontrol et
    const username = session?.username;
    if (!username) {
        throw new Error('Kullanıcı girişi yapılmamış.');
    }

    const db = await getDb();
    const [result] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);

    if (result.length === 0) {
        throw new Error('Kullanıcı bulunamadı.');
    }

    // Oturumda `userId` yoksa, veritabanından alınan `userId`'yi dön
    return result[0].id;
}

// Kullanıcı adı güncelleme
async function updateUsername(userId, newUsername) {
    try {
        const db = await getDb();

        // Yeni kullanıcı adı mevcut mu kontrol et
        const [existingUser] = await db.execute('SELECT * FROM users WHERE username = ?', [newUsername]);
        if (existingUser.length > 0) {
            return { success: false, message: 'Bu kullanıcı adı zaten alınmış.' };
        }

        // Kullanıcı adını güncelle
        await db.execute('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId]);

        // diaries tablosunda kullanıcı adı güncelle
        await db.execute('UPDATE diaries SET username = ? WHERE user_id = ?', [newUsername, userId]);

        return { success: true, message: 'Kullanıcı adı başarıyla güncellendi.' };
    } catch (err) {
        console.error('Kullanıcı adı güncelleme hatası:', err);
        return { success: false, message: 'Bir hata oluştu.' };
    }
}

// Kullanıcıyı silme
async function deleteUserById(userId) {
    try {
        const db = await getDb();
        const [result] = await db.execute('DELETE FROM users WHERE id = ?', [userId]);
        console.log('Delete Result:', result);  // Bu çıktıyı konsolda kontrol edin
        return result.affectedRows > 0;  // Eğer silme başarılıysa affectedRows > 0 olacaktır
    } catch (err) {
        console.error('Kullanıcı silme hatası:', err);
        return false;
    }
}


// Şifre doğrulama
async function validatePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
}

async function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex'); // Rastgele bir doğrulama tokeni
}

// Yeni bir kullanıcı kaydedildiğinde doğrulama e-postası gönderin
async function sendVerificationEmail(toEmail, verificationToken) {
    const verificationLink = `http://localhost:3000/verify?token=${verificationToken}`; // Doğrulama bağlantısı

    const mailOptions = {
        from: 'your-email@gmail.com', // Gönderen e-posta adresi
        to: toEmail,                  // Alıcı e-posta adresi
        subject: 'Hesap Doğrulama',
        text: `Hesabınızı doğrulamak için şu bağlantıya tıklayın: ${verificationLink}`,
        html: `<p>Hesabınızı doğrulamak için şu bağlantıya tıklayın: <a href="${verificationLink}">Doğrula</a></p>`
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('E-posta gönderildi:', info.response);
    } catch (error) {
        console.error('E-posta gönderilemedi:', error);
    }
}

export {
    findUserById,
    findUserByUsername,
    getUserIdFromSession,
    updateUsername,
    deleteUserById,
    validatePassword,
    generateVerificationToken,
};