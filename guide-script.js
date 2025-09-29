import { db } from './firebase-config.js';
import { generateNavbar } from './shared.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async function() {
    generateNavbar();

    const contentContainer = document.getElementById('guide-content');
    
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    if (!pageId) {
        contentContainer.innerHTML = `<h1>Error</h1><p>No page specified.</p>`;
        return;
    }

    try {
        const docRef = doc(db, "giveawayPages", pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().pageType === 'guide') {
            const pageData = docSnap.data();

            document.title = pageData.title;
            
            if (pageData.pageBackground) {
                document.body.style.background = pageData.pageBackground;
            }

            // ÄNDRING: Ingen konvertering. Mata in HTML direkt.
            contentContainer.innerHTML = pageData.content;

        } else {
            contentContainer.innerHTML = `<h1>404</h1><p>Page not found or is not a guide page.</p>`;
        }
    } catch (error) {
        console.error("Error fetching guide:", error);
        contentContainer.innerHTML = `<h1>Error</h1><p>Could not load content.</p>`;
    }
});