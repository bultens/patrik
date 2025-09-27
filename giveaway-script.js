import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, doc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {
    // Hämta alla nödvändiga element
    const container = document.getElementById('giveaway-item-container');
    const winnersContainer = document.getElementById('winners-list-container');
    const modal = document.getElementById('signup-modal');
    // ... (resten av element-hämtningen är oförändrad) ...
    const closeModalBtn = document.querySelector('.close-button');
    const form = document.getElementById('signup-form');
    const modalTitle = document.getElementById('modal-giveaway-title');
    const modalText = document.getElementById('modal-giveaway-text');
    const modalItemIdInput = document.getElementById('modal-item-id-for-signup');


    // Läs av vilken sida vi är på från URL:en
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    // Kör båda funktionerna för att ladda sidan
    loadGiveawayItems(pageId);
    loadRecentWinners();

    // Funktion för att ladda giveaway-items (modifierad från föregående steg)
    async function loadGiveawayItems(pageId) {
        if (!pageId) {
            container.innerHTML = '<p style="color:red;">Fel: Ingen giveaway-sida specificerad.</p>';
            return;
        }
        container.innerHTML = '<p>Laddar items...</p>';
        try {
            const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
            const querySnapshot = await getDocs(q);
            
            container.innerHTML = '';
            if (querySnapshot.empty) {
                container.innerHTML = '<p>Det finns inga giveaways för denna sida just nu.</p>';
                return;
            }

            const now = new Date();

            for (const itemDoc of querySnapshot.docs) {
                const itemData = itemDoc.data();
                const itemId = itemDoc.id;
                
                const card = document.createElement('div');
                card.className = 'item-card';

                const startTime = itemData.startTime.toDate();
                const endTime = itemData.endTime.toDate();

                let statusHTML = '';
                let isClickable = false;

                if (itemData.status === 'closed') {
                    card.style.filter = 'grayscale(80%)'; card.style.cursor = 'default';
                    const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
                    const winnersSnapshot = await getDocs(winnersQuery);
                    const winnerNames = winnersSnapshot.docs.map(doc => doc.data().username).join(', ');
                    statusHTML = `<p style="color: #ffc107; font-weight: bold;">Vinnare: ${winnerNames}</p>`;

                } else if (now > endTime) {
                    card.style.filter = 'grayscale(50%)'; card.style.cursor = 'default';
                    statusHTML = `<p style="font-style: italic;">Vinnare dras snart...</p>`;

                } else if (now >= startTime && now <= endTime) {
                    isClickable = true;
                    statusHTML = `<small>Aktiv till: ${endTime.toLocaleString('sv-SE')}</small>`;
                } else {
                    card.style.cursor = 'default';
                    statusHTML = `<small>Startar: ${startTime.toLocaleString('sv-SE')}</small>`;
                }

                card.innerHTML = `<img src="${itemData.imageURL}" alt="${itemData.title}"><<h3>${itemData.title}</h3><p>${itemData.description}</p><div class="status-container">${statusHTML}</div>`;
                
                if (isClickable) {
                    card.addEventListener('click', () => {
                        modalTitle.textContent = `Anmäl dig för: ${itemData.title}`;
                        modalText.textContent = itemData.modalText;
                        modalItemIdInput.value = itemId;
                        modal.style.display = 'flex';
                    });
                }
                container.appendChild(card);
            }
        } catch (error) { console.error("Fel vid hämtning av items: ", error); container.innerHTML = '<p style="color:red;">Kunde inte ladda giveaways.</p>'; }
    }

    // NY FUNKTION: Hämta och visa de senaste vinnarna
    async function loadRecentWinners() {
        winnersContainer.innerHTML = '<p>Laddar vinnare...</p>';
        try {
            const q = query(
                collection(db, "winners"),
                orderBy("drawnAt", "desc"), // Sortera efter nyaste först
                limit(10) // Hämta max 10 vinnare
            );
            const querySnapshot = await getDocs(q);

            winnersContainer.innerHTML = ''; // Rensa
            if (querySnapshot.empty) {
                winnersContainer.innerHTML = '<p>Inga vinnare har dragits än.</p>';
            } else {
                querySnapshot.forEach(doc => {
                    const winnerData = doc.data();
                    const winnerDiv = document.createElement('div');
                    winnerDiv.className = 'winner-entry';
                    winnerDiv.innerHTML = `
                        <span class="winner-name">${winnerData.username}</span>
                        <span class="item-name">Vann: ${winnerData.itemTitle}</span>
                    `;
                    winnersContainer.appendChild(winnerDiv);
                });
            }

        } catch (error) {
            console.error("Fel vid hämtning av vinnare:", error);
            winnersContainer.innerHTML = '<p style="color:red;">Kunde inte ladda vinnarlistan.</p>';
        }
    }

    // Modal-logik (oförändrad)
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target == modal) { modal.style.display = 'none'; } });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const itemId = modalItemIdInput.value;
        try {
            const itemRef = doc(db, "giveawayItems", itemId);
            await addDoc(collection(itemRef, "submissions"), {
                username: username,
                timestamp: new Date()
            });
            alert(`Tack, din anmälan för ${username} är mottagen!`);
            modal.style.display = 'none';
            form.reset();
        } catch (error) { console.error("Fel vid anmälan:", error); alert('Kunde inte spara din anmälan. Försök igen.'); }
    });
});