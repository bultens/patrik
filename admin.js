// Importera tjänster från vår config-fil
import { auth, db } from './firebase-config.js';
// Importera funktioner från Firebase SDKs
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- HTML-ELEMENT ---
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('admin-login-form');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');
const pagesListContainer = document.getElementById('pages-list-container');
const loadingIndicator = document.getElementById('loading-indicator');

// --- AUTH-LOGIK (oförändrad) ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm['email'].value;
    const password = loginForm['password'].value;
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => { loginError.textContent = ''; })
        .catch((error) => { loginError.textContent = 'Fel e-post eller lösenord.'; });
});

logoutButton.addEventListener('click', () => {
    signOut(auth).catch((error) => console.error('Utloggningsfel:', error));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        // Användaren är inloggad
        loginView.classList.add('hidden');
        adminView.classList.remove('hidden');
        loadGiveawayPages(); // Ladda sidorna från databasen när användaren loggat in
    } else {
        // Användaren är utloggad
        loginView.classList.remove('hidden');
        adminView.classList.add('hidden');
    }
});


// --- NY FUNKTIONALITET: HANTERA GIVEAWAY-SIDOR ---

// Funktion för att ladda och visa sidorna från Firestore
async function loadGiveawayPages() {
    loadingIndicator.classList.remove('hidden');
    pagesListContainer.innerHTML = ''; // Rensa tidigare innehåll

    try {
        const querySnapshot = await getDocs(collection(db, "giveawayPages"));
        
        if (querySnapshot.empty) {
            pagesListContainer.innerHTML = '<p>Inga sidor hittades i databasen.</p>';
        } else {
            querySnapshot.forEach(doc => {
                const pageData = doc.data();
                const pageId = doc.id;
                
                // Skapa ett "kort" för varje sida med formulärfält
                const pageCard = document.createElement('div');
                pageCard.className = 'page-card';
                pageCard.innerHTML = `
                    <h4>Sida: ${pageData.title} (ID: ${pageId})</h4>
                    
                    <label for="title-${pageId}">Titel:</label>
                    <input type="text" id="title-${pageId}" value="${pageData.title}">
                    
                    <label for="desc-${pageId}">Beskrivning:</label>
                    <textarea id="desc-${pageId}" rows="3">${pageData.description}</textarea>
                    
                    <label for="image-${pageId}">Bildfil:</label>
                    <input type="text" id="image-${pageId}" value="${pageData.image}">

                    <div class="checkbox-group">
                        <input type="checkbox" id="isActive-${pageId}" ${pageData.isActive ? 'checked' : ''}>
                        <label for="isActive-${pageId}">Aktiv (visas på startsidan)</label>
                    </div>
                    
                    <button class="save-page-btn" data-id="${pageId}">Spara ändringar</button>
                    <span id="feedback-${pageId}" style="margin-left: 10px; color: lightgreen;"></span>
                `;
                pagesListContainer.appendChild(pageCard);
            });

            // Lägg till event listeners på alla nya spara-knappar
            addSaveButtonListeners();
        }
    } catch (error) {
        console.error("Fel vid hämtning av sidor: ", error);
        pagesListContainer.innerHTML = '<p style="color: red;">Kunde inte ladda sidor från databasen.</p>';
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// Funktion för att lägga till lyssnare på spara-knapparna
function addSaveButtonListeners() {
    document.querySelectorAll('.save-page-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const pageId = e.target.dataset.id;
            const feedbackSpan = document.getElementById(`feedback-${pageId}`);
            feedbackSpan.textContent = 'Sparar...';

            // Hämta de nya värdena från formuläret
            const newTitle = document.getElementById(`title-${pageId}`).value;
            const newDesc = document.getElementById(`desc-${pageId}`).value;
            const newImage = document.getElementById(`image-${pageId}`).value;
            const newIsActive = document.getElementById(`isActive-${pageId}`).checked;

            // Skapa en referens till dokumentet i Firestore
            const pageRef = doc(db, "giveawayPages", pageId);

            try {
                // Uppdatera dokumentet med de nya värdena
                await updateDoc(pageRef, {
                    title: newTitle,
                    description: newDesc,
                    image: newImage,
                    isActive: newIsActive
                });
                feedbackSpan.textContent = 'Sparat!';
            } catch (error) {
                console.error("Fel vid uppdatering: ", error);
                feedbackSpan.textContent = 'Fel vid sparande.';
                feedbackSpan.style.color = 'red';
            }

            // Ta bort meddelandet efter några sekunder
            setTimeout(() => { feedbackSpan.textContent = ''; }, 3000);
        });
    });
}