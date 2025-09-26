// Importera databas-anslutningen och nödvändiga Firestore-funktioner
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Vänta tills hela sidan har laddats
document.addEventListener('DOMContentLoaded', function() {
    // Hämta container-elementet från HTML
    const container = document.getElementById('giveaway-container');

    // Funktion för att ladda och visa giveaways från databasen
    const loadHomepageGiveaways = async () => {
        // Visa ett laddningsmeddelande
        container.innerHTML = '<p>Laddar giveaways...</p>';

        try {
            // Skapa en fråga till databasen:
            // 1. Gå till "giveawayPages"-samlingen
            // 2. Hämta endast de där fältet "isActive" är sant
            // 3. Sortera dem efter fältet "order"
            const q = query(
                collection(db, "giveawayPages"), 
                where("isActive", "==", true),
                orderBy("order")
            );

            const querySnapshot = await getDocs(q);

            // Rensa laddningsmeddelandet
            container.innerHTML = '';

            if (querySnapshot.empty) {
                container.innerHTML = '<p>Det finns inga aktiva giveaways just nu. Kom tillbaka senare!</p>';
                return;
            }

            // Gå igenom varje dokument (giveaway) som hittades och skapa ett kort
            querySnapshot.forEach((doc) => {
                const giveaway = doc.data();

                // Bygg upp länken dynamiskt. Den kommer nu se ut t.ex. "giveaway.html?page=grow-a-garden"
                const cardLink = document.createElement('a');
                cardLink.href = `giveaway.html?page=${giveaway.pageId}`;
                cardLink.className = 'giveaway-card-link';

                const card = document.createElement('div');
                card.className = 'giveaway-card';

                const image = document.createElement('img');
                image.src = giveaway.image; // Använd bild från databasen
                image.alt = giveaway.title;

                const content = document.createElement('div');
                content.className = 'giveaway-card-content';

                const title = document.createElement('h2');
                title.textContent = giveaway.title; // Använd titel från databasen

                const description = document.createElement('p');
                description.textContent = giveaway.description; // Använd beskrivning från databasen
                
                content.appendChild(title);
                content.appendChild(description);
                
                card.appendChild(image);
                card.appendChild(content);

                cardLink.appendChild(card);
                container.appendChild(cardLink);
            });

        } catch (error) {
            console.error("Fel vid hämtning av giveaways:", error);
            container.innerHTML = '<p style="color:red;">Kunde inte ladda giveaways. Försök igen senare.</p>';
        }
    };

    // Kör funktionen för att ladda giveaways
    loadHomepageGiveaways();
});