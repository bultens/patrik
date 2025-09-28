import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, doc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Funktion för att bygga navigeringsmenyn
async function generateNavbar() {
    const navContainer = document.getElementById('main-nav');
    if (!navContainer) return;

    const pagesQuery = query(
        collection(db, "giveawayPages"),
        where("isActive", "==", true),
        orderBy("order")
    );
    const querySnapshot = await getDocs(pagesQuery);

    let navHTML = `<a href="index.html">Main</a>`;
    querySnapshot.forEach(doc => {
        const page = doc.data();
        navHTML += `<a href="giveaway.html?page=${page.pageId}">${page.title}</a>`;
    });

    navContainer.innerHTML = navHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    // Kör funktionen som bygger upp nav-menyn
    generateNavbar();

    // Hämta alla nödvändiga HTML-element
    const container = document.getElementById('giveaway-item-container');
    const winnersContainer = document.getElementById('winners-list-container');
    const modal = document.getElementById('signup-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const form = document.getElementById('signup-form');
    const modalTitle = document.getElementById('modal-giveaway-title');
    const modalText = document.getElementById('modal-giveaway-text');
    const modalItemIdInput = document.getElementById('modal-item-id-for-signup');
    
    // Läs av vilken sida vi är på från URL:en
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    // Kör de sid-specifika laddningsfunktionerna
    loadGiveawayItems(pageId);
    loadPageWinners(pageId);

    // Funktion för att ladda giveaway-items
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
                    card.style.filter = 'grayscale(80%)';
                    card.style.cursor = 'default';
                    
                    const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
                    const winnersSnapshot = await getDocs(winnersQuery);
                    const winnerNames = winnersSnapshot.docs.map(doc => doc.data().username).join(', ');
                    statusHTML = `<p style="color: #ffc107; font-weight: bold;">Vinnare: ${winnerNames}</p>`;

                } else if (now > endTime) {
                    card.style.filter = 'grayscale(50%)';
                    card.style.cursor = 'default';
                    statusHTML = `<p style="font-style: italic;">Vinnare dras snart...</p>`;

                } else if (now >= startTime && now <= endTime) {
                    isClickable = true;
                    statusHTML = `<small>Aktiv till: ${endTime.toLocaleString('sv-SE')}</small>`;
                } else {
                    card.style.cursor = 'default';
                    statusHTML = `<small>Startar: ${startTime.toLocaleString('sv-SE')}</small>`;
                }

                card.innerHTML = `
                    <img src="${itemData.imageURL}" alt="${itemData.title}">
                    <h3>${itemData.title}</h3>
                    <p>${itemData.description}</p>
                    <div class="status-container">${statusHTML}</div>
                `;
                
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
        } catch (error) {
            console.error("Fel vid hämtning av items: ", error);
            container.innerHTML = '<p style="color:red;">Kunde inte ladda giveaways.</p>';
        }
    }

    // Funktion för att ladda sid-specifika vinnare
    async function loadPageWinners(pageId) {
        if (!pageId) return;
        winnersContainer.innerHTML = '<p>Laddar vinnare...</p>';
        try {
            // Steg 1: Hämta alla item-ID:n för den aktuella sidan
            const itemsQuery = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
            const itemsSnapshot = await getDocs(itemsQuery);
            const itemIds = itemsSnapshot.docs.map(doc => doc.id);

            if (itemIds.length === 0) {
                winnersContainer.innerHTML = '<p>Inga giveaways har avslutats på denna sida än.</p>';
                return;
            }

            // Steg 2: Hämta alla vinnare vars itemId finns i vår lista av item-ID:n
            const winnersQuery = query(
                collection(db, "winners"),
                where("itemId", "in", itemIds),
                orderBy("drawnAt", "desc")
            );
            const winnersSnapshot = await getDocs(winnersQuery);

            winnersContainer.innerHTML = '';
            if (winnersSnapshot.empty) {
                winnersContainer.innerHTML = '<p>Inga vinnare har dragits på denna sida än.</p>';
            } else {
                winnersSnapshot.forEach(doc => {
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
            console.error("Fel vid hämtning av sid-specifika vinnare:", error);
            winnersContainer.innerHTML = '<p style="color:red;">Kunde inte ladda vinnarlistan.</p>';
        }
    }

    // Modal-logik
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const itemId = modalItemIdInput.value;

        if (!itemId) {
            alert('Ett fel uppstod. Försök igen.');
            return;
        }

        try {
            const itemRef = doc(db, "giveawayItems", itemId);
            await addDoc(collection(itemRef, "submissions"), {
                username: username,
                timestamp: new Date()
            });

            alert(`Tack, din anmälan för ${username} är mottagen!`);
            modal.style.display = 'none';
            form.reset();
        } catch (error) {
            console.error("Fel vid anmälan:", error);
            alert('Kunde inte spara din anmälan. Försök igen.');
        }
    });
});