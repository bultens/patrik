// Importera tjänster från vår config-fil
import { auth, db } from './firebase-config.js';
// Importera funktioner från Firebase SDKs
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, query, where, addDoc, deleteDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- HTML-ELEMENT ---
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('admin-login-form');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');
const pagesListContainer = document.getElementById('pages-list-container');
const loadingIndicator = document.getElementById('loading-indicator');
const itemModal = document.getElementById('item-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');
const closeModalBtn = document.querySelector('.close-btn');

// --- AUTH-LOGIK (oförändrad) ---
loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = loginForm['email'].value; const password = loginForm['password'].value; signInWithEmailAndPassword(auth, email, password).then(() => { loginError.textContent = ''; }).catch(() => { loginError.textContent = 'Fel e-post eller lösenord.'; }); });
logoutButton.addEventListener('click', () => { signOut(auth); });
onAuthStateChanged(auth, (user) => { if (user) { loginView.classList.add('hidden'); adminView.classList.remove('hidden'); loadGiveawayPages(); } else { loginView.classList.remove('hidden'); adminView.classList.add('hidden'); } });

// --- HANTERA GIVEAWAY-SIDOR ---
async function loadGiveawayPages() {
    loadingIndicator.classList.remove('hidden');
    pagesListContainer.innerHTML = '';
    try {
        const querySnapshot = await getDocs(collection(db, "giveawayPages"));
        if (querySnapshot.empty) { pagesListContainer.innerHTML = '<p>Inga sidor hittades.</p>'; } 
        else {
            querySnapshot.forEach(doc => {
                const pageData = doc.data(); const pageId = doc.id;
                const pageCard = document.createElement('div');
                pageCard.className = 'page-card';
                pageCard.innerHTML = `<h4>Sida: ${pageData.title} (ID: ${pageId})</h4><label for="title-${pageId}">Titel:</label><input type="text" id="title-${pageId}" value="${pageData.title}"><label for="desc-${pageId}">Beskrivning:</label><textarea id="desc-${pageId}" rows="3">${pageData.description}</textarea><label for="image-${pageId}">Bildfil:</label><input type="text" id="image-${pageId}" value="${pageData.image}"><div class="checkbox-group"><input type="checkbox" id="isActive-${pageId}" ${pageData.isActive ? 'checked' : ''}><label for="isActive-${pageId}">Aktiv (visas på startsidan)</label></div><button class="save-page-btn" data-id="${pageId}">Spara ändringar</button><span id="feedback-${pageId}" style="margin-left: 10px; color: lightgreen;"></span>
                <div class="items-section"><h5>Giveaway Items på denna sida:</h5><div class="items-list" id="items-list-${pageId}">Laddar items...</div><button class="add-item-btn" data-page-id="${pageId}">+ Lägg till nytt item</button></div>`;
                pagesListContainer.appendChild(pageCard);
                loadItemsForPage(pageId); // Ladda items för denna sida
            });
            addSaveButtonListeners();
            addAddItemButtonListeners();
        }
    } catch (error) { console.error("Fel vid hämtning av sidor: ", error); pagesListContainer.innerHTML = '<p style="color: red;">Kunde inte ladda sidor.</p>'; } 
    finally { loadingIndicator.classList.add('hidden'); }
}
function addSaveButtonListeners() { document.querySelectorAll('.save-page-btn').forEach(button => { button.addEventListener('click', async (e) => { const pageId = e.target.dataset.id; const feedbackSpan = document.getElementById(`feedback-${pageId}`); feedbackSpan.textContent = 'Sparar...'; const newTitle = document.getElementById(`title-${pageId}`).value; const newDesc = document.getElementById(`desc-${pageId}`).value; const newImage = document.getElementById(`image-${pageId}`).value; const newIsActive = document.getElementById(`isActive-${pageId}`).checked; const pageRef = doc(db, "giveawayPages", pageId); try { await updateDoc(pageRef, { title: newTitle, description: newDesc, image: newImage, isActive: newIsActive }); feedbackSpan.textContent = 'Sparat!'; } catch (error) { feedbackSpan.textContent = 'Fel vid sparande.'; feedbackSpan.style.color = 'red'; } setTimeout(() => { feedbackSpan.textContent = ''; }, 3000); }); }); }

// --- NYTT: HANTERA GIVEAWAY ITEMS ---

// Ladda alla items som tillhör en specifik sida
async function loadItemsForPage(pageId) {
    const itemsListContainer = document.getElementById(`items-list-${pageId}`);
    const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
    try {
        const querySnapshot = await getDocs(q);
        itemsListContainer.innerHTML = ''; // Rensa
        if (querySnapshot.empty) { itemsListContainer.innerHTML = '<p>Inga items har lagts till på denna sida än.</p>'; }
        else {
            querySnapshot.forEach(doc => {
                const itemData = doc.data();
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-listing';
                itemDiv.innerHTML = `<span>${itemData.title}</span><div><button class="btn-edit" data-item-id="${doc.id}" data-page-id="${pageId}">Redigera</button><button class="btn-delete" data-item-id="${doc.id}" data-page-id="${pageId}">Radera</button></div>`;
                itemsListContainer.appendChild(itemDiv);
            });
        }
        // Lägg till lyssnare för de nya knapparna
        addEditOrDeleteButtonListeners(pageId);
    } catch (error) { console.error("Fel vid hämtning av items: ", error); itemsListContainer.innerHTML = 'Kunde inte ladda items.'; }
}

// Sätt upp lyssnare för "Lägg till nytt item"-knapparna
function addAddItemButtonListeners() {
    document.querySelectorAll('.add-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const pageId = e.target.dataset.pageId;
            modalTitle.textContent = "Lägg till nytt Item";
            itemForm.reset();
            document.getElementById('modal-page-id').value = pageId;
            document.getElementById('modal-item-id').value = ''; // Rensa item-id för "nytt" läge
            itemModal.classList.remove('hidden');
        });
    });
}

// Sätt upp lyssnare för Redigera- och Radera-knapparna
function addEditOrDeleteButtonListeners(pageId) {
    document.querySelectorAll(`#items-list-${pageId} .btn-edit`).forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.dataset.itemId;
            // Hämta item-data för att fylla i formuläret (här kan man optimera genom att skicka med datan)
            const itemRef = doc(db, "giveawayItems", itemId);
            const docSnap = await getDocs(query(collection(db, "giveawayItems"), where("__name__", "==", itemId)));
            const itemData = docSnap.docs[0].data();

            modalTitle.textContent = "Redigera Item";
            itemForm.reset();
            document.getElementById('modal-page-id').value = pageId;
            document.getElementById('modal-item-id').value = itemId;

            // Fyll i formuläret
            document.getElementById('item-title').value = itemData.title;
            document.getElementById('item-description').value = itemData.description;
            document.getElementById('item-image').value = itemData.imageURL || '';
            document.getElementById('item-modalText').value = itemData.modalText;
            // Konvertera Firestore Timestamp till ett format som <input type="datetime-local"> förstår
            document.getElementById('item-startTime').value = itemData.startTime.toDate().toISOString().slice(0, 16);
            document.getElementById('item-endTime').value = itemData.endTime.toDate().toISOString().slice(0, 16);
            
            itemModal.classList.remove('hidden');
        });
    });

    document.querySelectorAll(`#items-list-${pageId} .btn-delete`).forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.dataset.itemId;
            const pageId = e.target.dataset.pageId;
            if (confirm('Är du säker på att du vill radera detta item? Detta går inte att ångra.')) {
                await deleteDoc(doc(db, "giveawayItems", itemId));
                loadItemsForPage(pageId); // Ladda om listan
            }
        });
    });
}

// Stäng modalen
closeModalBtn.addEventListener('click', () => itemModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target == itemModal) { itemModal.classList.add('hidden'); } });

// Hantera formulär-submit i modalen
itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pageId = document.getElementById('modal-page-id').value;
    const itemId = document.getElementById('modal-item-id').value;

    const data = {
        pageId: pageId,
        title: document.getElementById('item-title').value,
        description: document.getElementById('item-description').value,
        imageURL: document.getElementById('item-image').value,
        modalText: document.getElementById('item-modalText').value,
        startTime: Timestamp.fromDate(new Date(document.getElementById('item-startTime').value)),
        endTime: Timestamp.fromDate(new Date(document.getElementById('item-endTime').value))
    };

    if (itemId) { // Om itemId finns, uppdatera ett befintligt item
        await updateDoc(doc(db, "giveawayItems", itemId), data);
    } else { // Annars, skapa ett nytt
        await addDoc(collection(db, "giveawayItems"), data);
    }

    itemModal.classList.add('hidden');
    loadItemsForPage(pageId); // Ladda om listan med items för den aktuella sidan
});