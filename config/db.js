import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// .env dosyasını yükle
dotenv.config();

let db; // Veritabanı bağlantısını saklamak için bir değişken

// MySQL bağlantısı için yapılandırma ve bağlantıyı oluşturma
async function connectDB() {
    if (db) return db; // Eğer bağlantı daha önce oluşturulmuşsa, mevcut bağlantıyı geri döndür

    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',   // .env'den al, yoksa localhost kullan
            user: process.env.DB_USER || 'root',        // .env'den al, yoksa root kullan
            password: process.env.DB_PASSWORD || '',    // .env'den al, yoksa boş bırak
            database: process.env.DB_NAME || 'deneme'   // .env'den al, yoksa 'deneme' kullan
        });
        console.log('Veritabanına başarıyla bağlanıldı.');
        return db;
    } catch (err) {
        console.error('Veritabanına bağlanırken hata oluştu:', err.message);
        process.exit(1); // Bağlantı sağlanamazsa uygulama kapatılır
    }
}

// Veritabanı bağlantısını dışarıya aktarma fonksiyonu
export async function getDb() {
    return await connectDB();
}
