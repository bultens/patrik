import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, doc, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

async function generateNavbar() {
    const navContainer = document.getElementById('main-nav');
    if (!navContainer) return;

    const pagesQuery = query(collection(db, "giveawayPages"), where("isActive", "==", true), orderBy("order"));
    const querySnapshot = await getDocs(pagesQuery);

    let navHTML = `<a href="index.html">Main</a>`;
    querySnapshot.forEach(doc => {
        const page = doc.data();
        navHTML += `<a href="giveaway.html?page=${page.pageId}">${page.title}</a>`;
    });
    navContainer.innerHTML = navHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    generateNavbar();

    const container = document.getElementById('giveaway-item-container');
    const winnersContainer = document.getElementById('winners-list-container');
    const modal = document.getElementById('signup-modal');
    const closeModalBtn = document.querySelector('.close-button');
    const form = document.getElementById('signup-form');
    
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    loadGiveawayItems(pageId);
    loadPageWinners(pageId);

    async function loadGiveawayItems(pageId) {
        if (!pageId) {
            container.innerHTML = '<p style="color:red;">Error: No giveaway page specified.</p>';
            return;
        }
        container.innerHTML = '<p>Loading items...</p>';
        try {
            const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
            const querySnapshot = await getDocs(q);
            
            container.innerHTML = '';
            if (querySnapshot.empty) {
                container.innerHTML = '<p>There are no giveaways for this page right now.</p>';
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
                    statusHTML = `<p style="color: #ffc107; font-weight: bold;">Winner: ${winnerNames}</p>`;

                } else if (now > endTime) {
                    card.style.filter = 'grayscale(50%)';
                    card.style.cursor = 'default';
                    statusHTML = `<p style="font-style: italic;">Winner will be drawn soon...</p>`;

                } else if (now >= startTime && now <= endTime) {
                    isClickable = true;
                    statusHTML = `<small>Active until: ${endTime.toLocaleString('en-GB')}</small>`;
                } else {
                    card.style.cursor = 'default';
                    statusHTML = `<small>Starts: ${startTime.toLocaleString('en-GB')}</small>`;
                }

                card.innerHTML = `<img src="${itemData.imageURL}" alt="${itemData.title}"><<h3>${itemData.title}</h3><p>${itemData.description}</p><div class="status-container">${statusHTML}</div>`;
                
                if (isClickable) {
                    card.addEventListener('click', () => {
                        document.getElementById('modal-giveaway-title').textContent = `Sign up for: ${itemData.title}`;
                        document.getElementById('modal-giveaway-text').textContent = itemData.modalText;
                        document.getElementById('modal-item-id-for-signup').value = itemId;
                        modal.style.display = 'flex';
                    });
                }
                container.appendChild(card);
            }
        } catch (error) {
            console.error("Error fetching items: ", error);
            container.innerHTML = '<p style="color:red;">Could not load giveaways.</p>';
        }
    }

    async function loadPageWinners(pageId) {
        if (!pageId) return;
        winnersContainer.innerHTML = '<p>Loading winners...</p>';
        try {
            const itemsQuery = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
            const itemsSnapshot = await getDocs(itemsQuery);
            const itemIds = itemsSnapshot.docs.map(doc => doc.id);

            if (itemIds.length === 0) {
                winnersContainer.innerHTML = '<p>No giveaways have been completed on this page yet.</p>';
                return;
            }

            const winnersQuery = query(collection(db, "winners"), where("itemId", "in", itemIds), orderBy("drawnAt", "desc"));
            const winnersSnapshot = await getDocs(winnersQuery);

            winnersContainer.innerHTML = '';
            if (winnersSnapshot.empty) {
                winnersContainer.innerHTML = '<p>No winners have been drawn on this page yet.</p>';
            } else {
                winnersSnapshot.forEach(doc => {
                    const winnerData = doc.data();
                    const winnerDiv = document.createElement('div');
                    winnerDiv.className = 'winner-entry';
                    winnerDiv.innerHTML = `<span class="winner-name">${winnerData.username}</span><span class="item-name">Won: ${winnerData.itemTitle}</span>`;
                    winnersContainer.appendChild(winnerDiv);
                });
            }
        } catch (error) {
            console.error("Error fetching page-specific winners:", error);
            winnersContainer.innerHTML = '<p style="color:red;">Could not load the winners list.</p>';
        }
    }

    closeModalBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const itemId = document.getElementById('modal-item-id-for-signup').value;

        if (!itemId) {
            alert('An error occurred. Please try again.');
            return;
        }

        try {
            const itemRef = doc(db, "giveawayItems", itemId);
            await addDoc(collection(itemRef, "submissions"), {
                username: username,
                timestamp: new Date()
            });

            alert(`Thank you, your entry for ${username} has been received!`);
            modal.style.display = 'none';
            form.reset();
        } catch (error) {
            console.error("Error submitting entry:", error);
            alert('Could not save your entry. Please try again.');
        }
    });
});