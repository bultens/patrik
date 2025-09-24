document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('signup-modal');
    const itemCard = document.getElementById('boneblossom-card');
    const closeButton = document.querySelector('.close-button');
    const form = document.getElementById('signup-form');

    // Funktion för att öppna modalen
    function openModal() {
        modal.style.display = 'flex';
    }

    // Funktion för att stänga modalen
    function closeModal() {
        modal.style.display = 'none';
    }

    // Öppna modalen när man klickar på item-kortet
    if (itemCard) {
        itemCard.addEventListener('click', openModal);
    }
    
    // Stäng modalen när man klickar på (x)
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    // Stäng modalen om man klickar utanför innehållsrutan
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            closeModal();
        }
    });

    // Hantera formulärinskickning
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault(); // Förhindrar att sidan laddas om
            const username = document.getElementById('username').value;
            
            // Simulerar en lyckad anmälan
            alert(`Tack för din anmälan, ${username}! Vi kontaktar dig om du vinner.`);
            
            closeModal(); // Stäng modalen efter submit
            form.reset(); // Rensa formuläret
        });
    }
});