// Importera auth-tjänsten från vår config-fil
import { auth } from './firebase-config.js';
// Importera specifika funktioner vi behöver från Firebase Authentication SDK
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Hämta HTML-element
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('admin-login-form');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');

// --- INLOGGNINGSLOGIK ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Förhindra att sidan laddas om

    const email = loginForm['email'].value;
    const password = loginForm['password'].value;

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Inloggning lyckades
            console.log('Inloggad:', userCredential.user);
            loginError.textContent = ''; // Rensa eventuella felmeddelanden
        })
        .catch((error) => {
            // Något gick fel
            console.error('Inloggningsfel:', error);
            loginError.textContent = 'Fel e-post eller lösenord. Försök igen.';
        });
});

// --- UTLOGGNINGSLOGIK ---
logoutButton.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Utloggningsfel:', error);
    });
});

// --- KONTROLLERA INLOGGNINGSSTATUS ---
// Denna funktion körs automatiskt när sidan laddas och när inloggningsstatus ändras.
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Användaren är inloggad
        loginView.classList.add('hidden');
        adminView.classList.remove('hidden');
    } else {
        // Användaren är utloggad
        loginView.classList.remove('hidden');
        adminView.classList.add('hidden');
    }
});