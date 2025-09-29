import { db } from './firebase-config.js';
import { generateNavbar } from './shared.js';
import { collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function loadHomepageGiveaways() {
    const container = document.getElementById('giveaway-container');
    if (!container) return;

    container.innerHTML = '<p>Loading giveaways...</p>';
    try {
        const q = query(collection(db, "giveawayPages"), where("isActive", "==", true), orderBy("order"));
        const querySnapshot = await getDocs(q);
        container.innerHTML = '';
        if (querySnapshot.empty) {
            container.innerHTML = '<p>There are no active giveaways right now.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const giveaway = doc.data();
            const cardLink = document.createElement('a');
            
            // Länka till rätt sida baserat på typ
            const pageUrl = giveaway.pageType === 'guide' ? 'guide.html' : 'giveaway.html';
            cardLink.href = `${pageUrl}?page=${giveaway.pageId}`;
            
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
        console.error("Error fetching giveaways:", error);
        container.innerHTML = '<p style="color:red;">Could not load giveaways.</p>';
    }
}

async function loadHomepageWinners() {
    const winnersContainer = document.getElementById('homepage-winners-container');
    if (!winnersContainer) return;

    winnersContainer.innerHTML = '<p>Loading winners...</p>';
    try {
        const q = query(collection(db, "winners"), orderBy("drawnAt", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        winnersContainer.innerHTML = '';
        if (querySnapshot.empty) {
            winnersContainer.innerHTML = '<p>No winners have been drawn yet.</p>';
        } else {
            querySnapshot.forEach(doc => {
                const winnerData = doc.data();
                const winnerDiv = document.createElement('div');
                winnerDiv.className = 'winner-entry';
                winnerDiv.innerHTML = `<span class="winner-name">${winnerData.username}</span><span class="item-name">Won: ${winnerData.itemTitle}</span>`;
                winnersContainer.appendChild(winnerDiv);
            });
        }
    } catch (error) {
        console.error("Error fetching winners:", error);
        winnersContainer.innerHTML = '<p style="color:red;">Could not load the winners list.</p>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    generateNavbar();
    loadHomepageGiveaways();
    loadHomepageWinners();
});