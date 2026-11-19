MFA Demo Application

Εφαρμογή επίδειξης Πολυπαραγοντικής Αυθεντικοποίησης (MFA) με χρήση TOTP, υλοποιημένη στο πλαίσιο πτυχιακής εργασίας στο Τμήμα Ψηφιακών Συστημάτων του Πανεπιστημίου Πειραιώς.

Τεχνολογίες
Node.js + Express
MySQL
bcryptjs (κατακερματισμός κωδικών)
jsonwebtoken (JWT αυθεντικοποίηση)
otplib (TOTP - RFC 6238)
qrcode (παραγωγή QR Code)

Προαπαιτούμενα
Node.js (v18+)
MySQL Server

Εγκατάσταση
Κλωνοποίηση του repository:
bash
git clone https://github.com/<your-username>/mfa-demo.git
cd mfa-demo

Εγκατάσταση εξαρτήσεων:
bash
npm install

Δημιουργία αρχείου .env στον κεντρικό φάκελο:
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=mfa_demo
JWT_SECRET=your_jwt_secret_key

Δημιουργία βάσης δεδομένων και πίνακα:
sql
CREATE DATABASE mfa_demo;
USE mfa_demo;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  totp_secret VARCHAR(255),
  totp_enabled TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
Εκτέλεση
bash
node server.js

Ο server εκκινεί στο http://localhost:3000.

Εκτέλεση
bash
node server.js

Ο server εκκινεί στο http://localhost:3000.

API Endpoints
Method	Endpoint	Περιγραφή
POST	/api/auth/register	Εγγραφή νέου χρήστη
POST	/api/auth/login	Σύνδεση χρήστη
POST	/api/auth/totp/setup	Ρύθμιση TOTP (απαιτεί pre-auth token)
POST	/api/auth/totp/verify	Επαλήθευση TOTP (απαιτεί pre-auth token)

Ροή Αυθεντικοποίησης
POST /register → Εγγραφή χρήστη
POST /login → Αν δεν έχει TOTP: επιστρέφει JWT. Αν έχει TOTP: επιστρέφει preAuthToken
POST /totp/setup → Με Authorization: Bearer <preAuthToken> → επιστρέφει QR Code
POST /totp/verify → Με Authorization: Bearer <preAuthToken> + TOTP token → επιστρέφει JWT

