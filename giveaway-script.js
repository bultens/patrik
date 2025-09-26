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

    // --- 1. Läs av vilken sida vi är på från URL:en ---
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    if (!pageId) {
        container.innerHTML = '<p style="color:red;">Fel: Ingen giveaway-sida specificerad i URL:en.</p>';
        return;
    }

    // --- 2. Hämta och visa rätt items från databasen ---
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

        querySnapshot.forEach(doc => {
            const itemData = doc.data();
            const itemId = doc.id;

            // Konvertera start/sluttid från Firestore till vanliga datum
            const startTime = itemData.startTime.toDate();
            const endTime = itemData.endTime.toDate();

            // Kontrollera om giveawayen är aktiv
            const isActive = now >= startTime && now <= endTime;

            // Skapa kortet
            const card = document.createElement('div');
            card.className = 'item-card';
            if (!isActive) {
                card.classList.add('inactive'); // Lägg till klass för inaktiva kort (för ev. styling)
                card.style.filter = 'grayscale(80%)';
                card.style.cursor = 'not-allowed';
            }

            card.innerHTML = `
                <img src="${itemData.imageURL}" alt="${itemData.title}">
                <h3>${itemData.title}</h3>
                <p>${itemData.description}</p>
                <small>Aktiv från: ${startTime.toLocaleString('sv-SE')}</small><br>
                <small>Aktiv till: ${endTime.toLocaleString('sv-SE')}</small>
            `;

            // Om kortet är aktivt, gör det klickbart och öppna modalen
            if (isActive) {
                card.addEventListener('click', () => {
                    modalTitle.textContent = `Anmäl dig för: ${itemData.title}`;
                    modalText.textContent = itemData.modalText;
                    modalItemIdInput.value = itemId; // Spara item-id i ett dolt fält
                    modal.style.display = 'flex';
                });
            }
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Fel vid hämtning av items: ", error);
        container.innerHTML = '<p style="color:red;">Kunde inte ladda giveaways.</p>';
    }

    // --- 3. Logik för modal och formulär ---
    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => { if (e.target == modal) { modal.style.display = 'none'; } });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const itemId = modalItemIdInput.value;

        if (!itemId) {
            alert('Ett fel uppstod. Försök igen.');
            return;
        }

        try {
            // Spara anmälan i en "submissions" sub-collection under rätt item
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