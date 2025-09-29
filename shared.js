import { db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function generateNavbar() {
    const navContainer = document.getElementById('main-nav');
    if (!navContainer) return;

    try {
        const pagesQuery = query(
            collection(db, "giveawayPages"),
            where("isActive", "==", true),
            orderBy("order")
        );
        const querySnapshot = await getDocs(pagesQuery);

        let navHTML = `<a href="index.html">Main</a>`;
        querySnapshot.forEach(doc => {
            const page = doc.data();
            // Länka till rätt sidmall baserat på pageType
            const pageUrl = page.pageType === 'guide' ? 'guide.html' : 'giveaway.html';
            navHTML += `<a href="${pageUrl}?page=${page.pageId}">${page.title}</a>`;
        });
        navContainer.innerHTML = navHTML;
    } catch (error) {
        console.error("Could not generate navbar:", error);
        navContainer.innerHTML = `<a href="index.html">Main</a>`; // Felfångning, visar bara Main-länken
    }
}