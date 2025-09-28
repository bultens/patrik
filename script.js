import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// NY FUNKTION: Bygger navigeringsmenyn
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
    // Kör alla funktioner som ska bygga upp sidan
    generateNavbar();
    loadHomepageGiveaways();
    loadHomepageWinners();

    const container = document.getElementById('giveaway-container');

    // Funktion för att ladda giveaways (oförändrad)
    const loadHomepageGiveaways = async () => {
        // ... (denna funktion är exakt som förut) ...
        container.innerHTML = '<p>Laddar giveaways...</p>';
        try {
            const q = query(collection(db, "giveawayPages"), where("isActive", "==", true), orderBy("order"));
            const querySnapshot = await getDocs(q);
            container.innerHTML = '';
            if (querySnapshot.empty) {
                container.innerHTML = '<p>Inga aktiva giveaways just nu.</p>';
                return;
            }
            querySnapshot.forEach((doc) => {
                const giveaway = doc.data();
                const cardLink = document.createElement('a');
                cardLink.href = `giveaway.html?page=${giveaway.pageId}`;
                cardLink.className = 'giveaway-card-link';
                const card = document.createElement('div');
                card.className = 'giveaway-card';
                const image = document.createElement('img');
                image.src = giveaway.image;
                image.alt = giveaway.title;
                const content = document.createElement('div');
                content.className = 'giveaway-card-content';
                const title = document.createElement('h2');
                title.textContent = giveaway.title;
                const description = document.createElement('p');
                description.textContent = giveaway.description;
                content.appendChild(title);
                content.appendChild(description);
                card.appendChild(image);
                card.appendChild(content);
                cardLink.appendChild(card);
                container.appendChild(cardLink);
            });
        } catch (error) {
            console.error("Fel vid hämtning av giveaways:", error);
            container.innerHTML = '<p style="color:red;">Kunde inte ladda giveaways.</p>';
        }
    };

    // Funktion för att ladda senaste vinnare (oförändrad)
    async function loadHomepageWinners() {
        // ... (denna funktion är exakt som förut) ...
        const winnersContainer = document.getElementById('homepage-winners-container');
        if (!winnersContainer) return;
        winnersContainer.innerHTML = '<p>Laddar vinnare...</p>';
        try {
            const q = query(collection(db, "winners"), orderBy("drawnAt", "desc"), limit(5));
            const querySnapshot = await getDocs(q);
            winnersContainer.innerHTML = '';
            if (querySnapshot.empty) {
                winnersContainer.innerHTML = '<p>Inga vinnare har dragits än.</p>';
            } else {
                querySnapshot.forEach(doc => {
                    const winnerData = doc.data();
                    const winnerDiv = document.createElement('div');
                    winnerDiv.className = 'winner-entry';
                    winnerDiv.innerHTML = `<span class="winner-name">${winnerData.username}</span><span class="item-name">Vann: ${winnerData.itemTitle}</span>`;
                    winnersContainer.appendChild(winnerDiv);
                });
            }
        } catch (error) {
            console.error("Fel vid hämtning av vinnare:", error);
            winnersContainer.innerHTML = '<p style="color:red;">Kunde inte ladda vinnarlistan.</p>';
        }
    }
});