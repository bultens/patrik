import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const closeItemModalBtn = document.getElementById('close-item-modal');
const winnerModal = document.getElementById('winner-modal');
const winnerModalTitle = document.getElementById('winner-modal-title');
const closeWinnerModalBtn = document.getElementById('close-winner-modal');
const drawView = document.getElementById('draw-view');
const winnerResultsDiv = document.getElementById('winner-results');
const winnerListDiv = document.getElementById('winner-list');
const drawWinnersBtn = document.getElementById('draw-winners-btn');
const saveWinnersBtn = document.getElementById('save-winners-btn');
const winnerFeedback = document.getElementById('winner-feedback');

let drawnWinners = [];

loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = loginForm['email'].value; const password = loginForm['password'].value; signInWithEmailAndPassword(auth, email, password).then(() => { loginError.textContent = ''; }).catch(() => { loginError.textContent = 'Fel e-post eller lösenord.'; }); });
logoutButton.addEventListener('click', () => { signOut(auth); });
onAuthStateChanged(auth, (user) => { if (user) { loginView.classList.add('hidden'); adminView.classList.remove('hidden'); loadGiveawayPages(); } else { loginView.classList.remove('hidden'); adminView.classList.add('hidden'); } });

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

function addSaveButtonListeners() {
    document.querySelectorAll('.save-page-btn').forEach(button => { button.addEventListener('click', async (e) => { const pageId = e.target.dataset.id; const feedbackSpan = document.getElementById(`feedback-${pageId}`); feedbackSpan.textContent = 'Sparar...'; const newTitle = document.getElementById(`title-${pageId}`).value; const newDesc = document.getElementById(`desc-${pageId}`).value; const newImage = document.getElementById(`image-${pageId}`).value; const newIsActive = document.getElementById(`isActive-${pageId}`).checked; const pageRef = doc(db, "giveawayPages", pageId); try { await updateDoc(pageRef, { title: newTitle, description: newDesc, image: newImage, isActive: newIsActive }); feedbackSpan.textContent = 'Sparat!'; } catch (error) { feedbackSpan.textContent = 'Fel vid sparande.'; feedbackSpan.style.color = 'red'; } setTimeout(() => { feedbackSpan.textContent = ''; }, 3000); }); });
}

async function loadItemsForPage(pageId) {
    const itemsListContainer = document.getElementById(`items-list-${pageId}`);
    const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
    try {
        const querySnapshot = await getDocs(q);
        itemsListContainer.innerHTML = '';
        if (querySnapshot.empty) { itemsListContainer.innerHTML = '<p>Inga items har lagts till.</p>'; }
        else {
            querySnapshot.forEach(itemDoc => {
                const itemData = itemDoc.data();
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-listing';
                let buttonsHTML = '';
                if (itemData.status === 'closed') {
                    buttonsHTML = `<button class="btn-view-winners" data-item-id="${itemDoc.id}" data-item-title="${itemData.title}">Visa vinnare</button>
                                   <button class="btn-delete" data-item-id="${itemDoc.id}" data-page-id="${pageId}">Radera (Arkivera)</button>`;
                } else {
                    buttonsHTML = `<button class="btn-draw" data-item-id="${itemDoc.id}" data-item-title="${itemData.title}">Slumpa vinnare</button>
                                   <button class="btn-edit" data-item-id="${itemDoc.id}" data-page-id="${pageId}">Redigera</button>
                                   <button class="btn-delete" data-item-id="${itemDoc.id}" data-page-id="${pageId}">Radera</button>`;
                }
                itemDiv.innerHTML = `<span>${itemData.title}</span><div>${buttonsHTML}</div>`;
                itemsListContainer.appendChild(itemDiv);
            });
        }
        addEventListenersForItemButtons(pageId);
    } catch (error) { console.error("Fel vid hämtning av items: ", error); itemsListContainer.innerHTML = 'Kunde inte ladda items.'; }
}

function addAddItemButtonListeners() {
    document.querySelectorAll('.add-item-btn').forEach(button => { button.addEventListener('click', (e) => { const pageId = e.target.dataset.pageId; modalTitle.textContent = "Lägg till nytt Item"; itemForm.reset(); document.getElementById('modal-page-id').value = pageId; document.getElementById('modal-item-id').value = ''; itemModal.classList.remove('hidden'); }); });
}

function addEventListenersForItemButtons(pageId) {
    const listContainer = document.querySelector(`#items-list-${pageId}`);
    listContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const itemId = target.dataset.itemId;
        if (!itemId) return;

        if (target.classList.contains('btn-edit')) {
            const docRef = doc(db, "giveawayItems", itemId);
            const docSnap = await getDoc(docRef);
            const itemData = docSnap.data();
            modalTitle.textContent = "Redigera Item"; itemForm.reset(); document.getElementById('modal-page-id').value = pageId; document.getElementById('modal-item-id').value = itemId; document.getElementById('item-title').value = itemData.title; document.getElementById('item-description').value = itemData.description; document.getElementById('item-image').value = itemData.imageURL || ''; document.getElementById('item-modalText').value = itemData.modalText; document.getElementById('item-startTime').value = itemData.startTime.toDate().toISOString().slice(0, 16); document.getElementById('item-endTime').value = itemData.endTime.toDate().toISOString().slice(0, 16); itemModal.classList.remove('hidden');
        } 
        else if (target.classList.contains('btn-delete')) {
            const docRef = doc(db, "giveawayItems", itemId);
            const docSnap = await getDoc(docRef);
            const itemData = docSnap.data();
            if (itemData.status === 'closed') {
                if (confirm('Detta item har dragna vinnare. Vill du arkivera itemet och vinnarna innan du raderar?')) {
                    const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
                    const winnersSnapshot = await getDocs(winnersQuery);
                    const winnersData = winnersSnapshot.docs.map(d => d.data());
                    await addDoc(collection(db, "archivedGiveaways"), { ...itemData, archivedAt: Timestamp.now(), winners: winnersData });
                    await deleteDoc(docRef); // I en verklig app, radera även vinnarna från 'winners'
                    alert('Item och vinnare har arkiverats och raderats.');
                    loadItemsForPage(pageId);
                }
            } else {
                if (confirm('Är du säker på att du vill radera detta item?')) {
                    await deleteDoc(docRef);
                    loadItemsForPage(pageId);
                }
            }
        } 
        else if (target.classList.contains('btn-draw')) {
            openWinnerModal(itemId, target.dataset.itemTitle);
        }
        else if (target.classList.contains('btn-view-winners')) {
            winnerFeedback.textContent = 'Hämtar vinnare...';
            winnerModalTitle.textContent = `Vinnare för: ${target.dataset.itemTitle}`;
            drawView.classList.add('hidden');
            winnerResultsDiv.classList.remove('hidden');
            saveWinnersBtn.classList.add('hidden');
            
            const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
            const winnersSnapshot = await getDocs(winnersQuery);
            const winnerNames = winnersSnapshot.docs.map(d => d.data().username);
            
            winnerListDiv.innerHTML = winnerNames.map(name => `<p>${name}</p>`).join('') || "<p>Inga vinnare hittades.</p>";
            winnerFeedback.textContent = '';
            winnerModal.classList.remove('hidden');
        }
    });
}

closeItemModalBtn.addEventListener('click', () => itemModal.classList.add('hidden'));
itemForm.addEventListener('submit', async (e) => { e.preventDefault(); const pageId = document.getElementById('modal-page-id').value; const itemId = document.getElementById('modal-item-id').value; const data = { pageId: pageId, title: document.getElementById('item-title').value, description: document.getElementById('item-description').value, imageURL: document.getElementById('item-image').value, modalText: document.getElementById('item-modalText').value, startTime: Timestamp.fromDate(new Date(document.getElementById('item-startTime').value)), endTime: Timestamp.fromDate(new Date(document.getElementById('item-endTime').value)) }; if (itemId) { await updateDoc(doc(db, "giveawayItems", itemId), data); } else { await addDoc(collection(db, "giveawayItems"), data); } itemModal.classList.add('hidden'); loadItemsForPage(pageId); });

function openWinnerModal(itemId, itemTitle) {
    winnerModalTitle.textContent = `Slumpa vinnare för: ${itemTitle}`;
    document.getElementById('winner-modal-item-id').value = itemId;
    drawView.classList.remove('hidden');
    winnerResultsDiv.classList.add('hidden');
    saveWinnersBtn.classList.remove('hidden');
    winnerListDiv.innerHTML = '';
    winnerFeedback.textContent = '';
    document.getElementById('winner-count').value = 1;
    drawnWinners = [];
    winnerModal.classList.remove('hidden');
}

closeWinnerModalBtn.addEventListener('click', () => winnerModal.classList.add('hidden'));

drawWinnersBtn.addEventListener('click', async () => { const itemId = document.getElementById('winner-modal-item-id').value; const winnerCount = parseInt(document.getElementById('winner-count').value); winnerFeedback.textContent = 'Hämtar deltagare...'; drawnWinners = []; const submissionsRef = collection(db, "giveawayItems", itemId, "submissions"); const snapshot = await getDocs(submissionsRef); const participants = snapshot.docs.map(doc => doc.data().username); if (participants.length === 0) { winnerFeedback.textContent = 'Inga deltagare!'; return; } winnerFeedback.textContent = `${participants.length} deltagare hittades. Slumpar...`; const shuffled = participants.sort(() => 0.5 - Math.random()); drawnWinners = shuffled.slice(0, winnerCount); winnerListDiv.innerHTML = ''; if (drawnWinners.length > 0) { drawnWinners.forEach(winner => { const p = document.createElement('p'); p.textContent = winner; winnerListDiv.appendChild(p); }); winnerResultsDiv.classList.remove('hidden'); winnerFeedback.textContent = 'Dragning klar!'; } else { winnerFeedback.textContent = 'Kunde inte slumpa.'; } });
saveWinnersBtn.addEventListener('click', async () => { const itemId = document.getElementById('winner-modal-item-id').value; const itemTitle = winnerModalTitle.textContent.replace('Slumpa vinnare för: ', ''); if (drawnWinners.length === 0) { alert('Inga vinnare att spara.'); return; } winnerFeedback.textContent = 'Sparar...'; try { const batch = writeBatch(db); drawnWinners.forEach(winnerUsername => { const winnerRef = doc(collection(db, "winners")); batch.set(winnerRef, { itemId: itemId, itemTitle: itemTitle, username: winnerUsername, drawnAt: Timestamp.now() }); }); const itemRef = doc(db, "giveawayItems", itemId); batch.update(itemRef, { status: "closed" }); await batch.commit(); winnerFeedback.textContent = 'Vinnarna har sparats!'; setTimeout(() => { winnerModal.classList.add('hidden'); loadItemsForPage(document.querySelector(`[data-item-id="${itemId}"]`).dataset.pageId); }, 2000); } catch (error) { console.error("Fel vid sparande av vinnare: ", error); winnerFeedback.textContent = 'Ett fel uppstod.'; winnerFeedback.style.color = 'red'; } });