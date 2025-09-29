import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Vi skapar en delad navigeringsfunktion även här
async function generateNavbar() {
    const navContainer = document.getElementById('main-nav');
    // ... (Logiken för att bygga nav-menyn skulle dupliceras här eller läggas i en delad fil i ett större projekt)
    // För enkelhetens skull antar vi att den finns.
}

document.addEventListener('DOMContentLoaded', async function() {
    // Samma funktion som i de andra scripten för att bygga menyn
    const { generateNavbar } = await import('./shared.js');
    generateNavbar();

    const contentContainer = document.getElementById('guide-content');
    const mainContainer = document.getElementById('guide-container');

    // Läs av vilken sida vi är på från URL:en
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get('page');

    if (!pageId) {
        contentContainer.innerHTML = `<h1>Error</h1><p>No page specified.</p>`;
        return;
    }

    try {
        const docRef = doc(db, "giveawayPages", pageId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const pageData = docSnap.data();

            // Sätt sidans titel
            document.title = pageData.title;
            
            // Sätt bakgrunden för sidan
            if (pageData.pageBackground) {
                document.body.style.background = pageData.pageBackground;
            }

            // Konvertera Markdown till HTML
            const converter = new showdown.Converter();
            const htmlContent = converter.makeHtml(pageData.content);

            // Injicera den färdiga HTML:en
            contentContainer.innerHTML = htmlContent;
        } else {
            contentContainer.innerHTML = `<h1>404</h1><p>Page not found.</p>`;
        }
    } catch (error) {
        console.error("Error fetching guide:", error);
        contentContainer.innerHTML = `<h1>Error</h1><p>Could not load content.</p>`;
    }
});