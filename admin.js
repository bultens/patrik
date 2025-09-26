// Importera tjänster från vår config-fil
import { auth, db } from './firebase-config.js';
// Importera funktioner från Firebase SDKs
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- HTML-ELEMENT ---
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');
const loginForm = document.getElementById('admin-login-form');
const logoutButton = document.getElementById('logout-button');
const loginError = document.getElementById('login-error');
const pagesListContainer = document.getElementById('pages-list-container');
const loadingIndicator = document.getElementById('loading-indicator');
// Item Modal
const itemModal = document.getElementById('item-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');
const closeItemModalBtn = document.getElementById('close-item-modal');
// Winner Modal
const winnerModal = document.getElementById('winner-modal');
const winnerModalTitle = document.getElementById('winner-modal-title');
const closeWinnerModalBtn = document.getElementById('close-winner-modal');
const drawWinnersBtn = document.getElementById('draw-winners-btn');
const saveWinnersBtn = document.getElementById('save-winners-btn');
const winnerResultsDiv = document.getElementById('winner-results');
const winnerListDiv = document.getElementById('winner-list');
const winnerFeedback = document.getElementById('winner-feedback');

// --- Global variabel för att hålla vinnare temporärt ---
let drawnWinners = [];

// --- AUTH-LOGIK ---
// (Oförändrad från föregående steg)
loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = loginForm['email'].value; const password = loginForm['password'].value; signInWithEmailAndPassword(auth, email, password).then(() => { loginError.textContent = ''; }).catch(() => { loginError.textContent = 'Fel e-post eller lösenord.'; }); });
logoutButton.addEventListener('click', () => { signOut(auth); });
onAuthStateChanged(auth, (user) => { if (user) { loginView.classList.add('hidden'); adminView.classList.remove('hidden'); loadGiveawayPages(); } else { loginView.classList.remove('hidden'); adminView.classList.add('hidden'); } });

// --- HANTERA GIVEAWAY-SIDOR ---
// (Oförändrad från föregående steg, med ett tillägg i itemDiv.innerHTML)
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
                loadItemsForPage(pageId);
            });
            addSaveButtonListeners();
            addAddItemButtonListeners();
        }
    } catch (error) { console.error("Fel vid hämtning av sidor: ", error); pagesListContainer.innerHTML = '<p style="color: red;">Kunde inte ladda sidor.</p>'; } 
    finally { loadingIndicator.classList.add('hidden'); }
}
function addSaveButtonListeners() { /* ... oförändrad ... */ document.querySelectorAll('.save-page-btn').forEach(button => { button.addEventListener('click', async (e) => { const pageId = e.target.dataset.id; const feedbackSpan = document.getElementById(`feedback-${pageId}`); feedbackSpan.textContent = 'Sparar...'; const newTitle = document.getElementById(`title-${pageId}`).value; const newDesc = document.getElementById(`desc-${pageId}`).value; const newImage = document.getElementById(`image-${pageId}`).value; const newIsActive = document.getElementById(`isActive-${pageId}`).checked; const pageRef = doc(db, "giveawayPages", pageId); try { await updateDoc(pageRef, { title: newTitle, description: newDesc, image: newImage, isActive: newIsActive }); feedbackSpan.textContent = 'Sparat!'; } catch (error) { feedbackSpan.textContent = 'Fel vid sparande.'; feedbackSpan.style.color = 'red'; } setTimeout(() => { feedbackSpan.textContent = ''; }, 3000); }); }); }

// --- HANTERA GIVEAWAY ITEMS ---
async function loadItemsForPage(pageId) {
    const itemsListContainer = document.getElementById(`items-list-${pageId}`);
    const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
    try {
        const querySnapshot = await getDocs(q);
        itemsListContainer.innerHTML = '';
        if (querySnapshot.empty) { itemsListContainer.innerHTML = '<p>Inga items har lagts till.</p>'; }
        else {
            querySnapshot.forEach(doc => {
                const itemData = doc.data();
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-listing';
                // NYTT: Lade till "Slumpa vinnare"-knappen
                itemDiv.innerHTML = `<span>${itemData.title}</span><div><button class="btn-draw" data-item-id="${doc.id}" data-item-title="${itemData.title}">Slumpa vinnare</button><button class="btn-edit" data-item-id="${doc.id}" data-page-id="${pageId}">Redigera</button><button class="btn-delete" data-item-id="${doc.id}" data-page-id="${pageId}">Radera</button></div>`;
                itemsListContainer.appendChild(itemDiv);
            });
        }
        addEditOrDeleteButtonListeners(pageId);
    } catch (error) { console.error("Fel vid hämtning av items: ", error); itemsListContainer.innerHTML = 'Kunde inte ladda items.'; }
}
function addAddItemButtonListeners() { /* ... oförändrad ... */ document.querySelectorAll('.add-item-btn').forEach(button => { button.addEventListener('click', (e) => { const pageId = e.target.dataset.pageId; modalTitle.textContent = "Lägg till nytt Item"; itemForm.reset(); document.getElementById('modal-page-id').value = pageId; document.getElementById('modal-item-id').value = ''; itemModal.classList.remove('hidden'); }); }); }
function addEditOrDeleteButtonListeners(pageId) { /* ... oförändrad, men med tillägg för draw-knappen ... */ 
    const listContainer = document.querySelector(`#items-list-${pageId}`);
    listContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const itemId = target.dataset.itemId;

        if (target.classList.contains('btn-edit')) {
            const docSnap = await getDocs(query(collection(db, "giveawayItems"), where("__name__", "==", itemId)));
            const itemData = docSnap.docs[0].data();
            modalTitle.textContent = "Redigera Item";
            itemForm.reset();
            document.getElementById('modal-page-id').value = pageId;
            document.getElementById('modal-item-id').value = itemId;
            document.getElementById('item-title').value = itemData.title;
            document.getElementById('item-description').value = itemData.description;
            document.getElementById('item-image').value = itemData.imageURL || '';
            document.getElementById('item-modalText').value = itemData.modalText;
            document.getElementById('item-startTime').value = itemData.startTime.toDate().toISOString().slice(0, 16);
            document.getElementById('item-endTime').value = itemData.endTime.toDate().toISOString().slice(0, 16);
            itemModal.classList.remove('hidden');
        } else if (target.classList.contains('btn-delete')) {
            if (confirm('Är du säker på att du vill radera detta item?')) {
                await deleteDoc(doc(db, "giveawayItems", itemId));
                loadItemsForPage(pageId);
            }
        } else if (target.classList.contains('btn-draw')) {
            const itemTitle = target.dataset.itemTitle;
            openWinnerModal(itemId, itemTitle);
        }
    });
}
closeItemModalBtn.addEventListener('click', () => itemModal.classList.add('hidden'));
itemForm.addEventListener('submit', async (e) => { /* ... oförändrad ... */ e.preventDefault(); const pageId = document.getElementById('modal-page-id').value; const itemId = document.getElementById('modal-item-id').value; const data = { pageId: pageId, title: document.getElementById('item-title').value, description: document.getElementById('item-description').value, imageURL: document.getElementById('item-image').value, modalText: document.getElementById('item-modalText').value, startTime: Timestamp.fromDate(new Date(document.getElementById('item-startTime').value)), endTime: Timestamp.fromDate(new Date(document.getElementById('item-endTime').value)) }; if (itemId) { await updateDoc(doc(db, "giveawayItems", itemId), data); } else { await addDoc(collection(db, "giveawayItems"), data); } itemModal.classList.add('hidden'); loadItemsForPage(pageId); });


// --- NYTT: VINSTDRAGNING ---

function openWinnerModal(itemId, itemTitle) {
    winnerModalTitle.textContent = `Slumpa vinnare för: ${itemTitle}`;
    document.getElementById('winner-modal-item-id').value = itemId;
    winnerResultsDiv.classList.add('hidden');
    winnerListDiv.innerHTML = '';
    winnerFeedback.textContent = '';
    document.getElementById('winner-count').value = 1;
    drawnWinners = []; // Rensa gamla vinnare
    winnerModal.classList.remove('hidden');
}

closeWinnerModalBtn.addEventListener('click', () => winnerModal.classList.add('hidden'));

// Händelse för "Slumpa nu!"-knappen
drawWinnersBtn.addEventListener('click', async () => {
    const itemId = document.getElementById('winner-modal-item-id').value;
    const winnerCount = parseInt(document.getElementById('winner-count').value);
    winnerFeedback.textContent = 'Hämtar deltagare...';
    drawnWinners = [];

    // 1. Hämta alla deltagare (submissions)
    const submissionsRef = collection(db, "giveawayItems", itemId, "submissions");
    const snapshot = await getDocs(submissionsRef);
    const participants = snapshot.docs.map(doc => doc.data().username);

    if (participants.length === 0) {
        winnerFeedback.textContent = 'Inga deltagare att slumpa från!';
        return;
    }
    
    winnerFeedback.textContent = `${participants.length} deltagare hittades. Slumpar...`;

    // 2. Slumpa fram vinnare
    const shuffled = participants.sort(() => 0.5 - Math.random());
    drawnWinners = shuffled.slice(0, winnerCount);

    // 3. Visa resultatet
    winnerListDiv.innerHTML = '';
    if (drawnWinners.length > 0) {
        drawnWinners.forEach(winner => {
            const p = document.createElement('p');
            p.textContent = winner;
            winnerListDiv.appendChild(p);
        });
        winnerResultsDiv.classList.remove('hidden');
        winnerFeedback.textContent = 'Dragning klar!';
    } else {
        winnerFeedback.textContent = 'Kunde inte slumpa fram vinnare.';
    }
});

// Händelse för "Spara vinnare"-knappen
saveWinnersBtn.addEventListener('click', async () => {
    const itemId = document.getElementById('winner-modal-item-id').value;
    const itemTitle = winnerModalTitle.textContent.replace('Slumpa vinnare för: ', '');

    if (drawnWinners.length === 0) {
        alert('Inga vinnare att spara.');
        return;
    }

    winnerFeedback.textContent = 'Sparar vinnare till databasen...';

    try {
        // Använd en "batch write" för att utföra flera operationer samtidigt
        const batch = writeBatch(db);

        // Skapa ett dokument i "winners"-collection för varje vinnare
        drawnWinners.forEach(winnerUsername => {
            const winnerRef = doc(collection(db, "winners")); // Skapa en ny dokumentreferens
            batch.set(winnerRef, {
                itemId: itemId,
                itemTitle: itemTitle,
                username: winnerUsername,
                drawnAt: Timestamp.now()
            });
        });

        // Uppdatera status på det ursprungliga itemet
        const itemRef = doc(db, "giveawayItems", itemId);
        batch.update(itemRef, { status: "closed" });

        // Genomför alla operationer i batchen
        await batch.commit();

        winnerFeedback.textContent = 'Vinnarna har sparats och giveawayen har stängts!';
        setTimeout(() => {
            winnerModal.classList.add('hidden');
        }, 2000);

    } catch (error) {
        console.error("Fel vid sparande av vinnare: ", error);
        winnerFeedback.textContent = 'Ett fel uppstod vid sparandet.';
        winnerFeedback.style.color = 'red';
    }
});