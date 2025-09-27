import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function() {
    const container = document.getElementById('giveaway-item-container');
    const modal = document.getElementById('signup-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const form = document.getElementById('signup-form');
    const modalTitle = document.getElementById('modal-giveaway-title');
    const modalText = document.getElementById('modal-giveaway-text');
    const modalItemIdInput = document.getElementById('modal-item-id-for-signup');

    // Läs av vilken sida vi är på från URL:en
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    if (!pageId) {
        container.innerHTML = '<p style="color:red;">Fel: Ingen giveaway-sida specificerad i URL:en.</p>';
        return;
    }

    // Hämta och visa rätt items från databasen
    container.innerHTML = '<p>Laddar items...</p>';
    try {
        const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
        const querySnapshot = await getDocs(q);
        
        container.innerHTML = ''; // Rensa
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

            // NY LOGIK FÖR ATT HANTERA OLIKA STATUS
            if (itemData.status === 'closed') {
                // Status 1: Vinnare har dragits
                card.style.filter = 'grayscale(80%)';
                card.style.cursor = 'default';
                
                // Hämta vinnaren/vinnarna
                const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
                const winnersSnapshot = await getDocs(winnersQuery);
                const winnerNames = winnersSnapshot.docs.map(doc => doc.data().username).join(', ');
                statusHTML = `<p style="color: #ffc107; font-weight: bold;">Vinnare: ${winnerNames}</p>`;

            } else if (now > endTime) {
                // Status 2: Tiden har gått ut, men vinnare har inte dragits
                card.style.filter = 'grayscale(50%)';
                card.style.cursor = 'default';
                statusHTML = `<p style="font-style: italic;">Vinnare dras snart...</p>`;

            } else if (now >= startTime && now <= endTime) {
                // Status 3: Giveawayen är aktiv
                isClickable = true;
                statusHTML = `<small>Aktiv till: ${endTime.toLocaleString('sv-SE')}</small>`;
            } else {
                 // Status 4: Kommande giveaway
                card.style.cursor = 'default';
                statusHTML = `<small>Startar: ${startTime.toLocaleString('sv-SE')}</small>`;
            }

            // Bygg upp kortet
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

    // Logik för modal och formulär (oförändrad)
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
        } catch (error) {
            console.error("Fel vid anmälan:", error);
            alert('Kunde inte spara din anmälan. Försök igen.');
        }
    });
});