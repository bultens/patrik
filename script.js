document.addEventListener('DOMContentLoaded', function() {
    const giveaways = [
        /*
        {
            title: 'Minecraft: Java & Bedrock Edition',
            description: 'Ett äventyrsspel där du kan bygga vad du vill. Få din gratis nyckel nu!',
            image: 'https://via.placeholder.com/300x180.png?text=Minecraft',
            link: '#'
        },
        */
        {
            title: 'Grow A Garden',
            description: 'Ett avkopplande spel där du kan odla din egen virtuella trädgård. Klicka här för att se giveaways!',
            image: 'growagarden.png',
            link: 'giveaway.html' // Länkar nu till den nya sidan
        }
        /*
        {
            title: 'Epic Game Store Mystery Game',
            description: 'Varje vecka ger Epic Games bort ett gratis spel. Se vad som är gratis den här veckan!',
            image: 'https://via.placeholder.com/300x180.png?text=Mystery+Game',
            link: '#'
        },
        {
            title: 'Steam Key Giveaway',
            description: 'En slumpmässig Steam-nyckel för ett spännande indie-spel.',
            image: 'https://via.placeholder.com/300x180.png?text=Steam+Key',
            link: '#'
        }
        */
    ];

    const container = document.getElementById('giveaway-container');

    giveaways.forEach(giveaway => {
        // Hela kortet är nu en <a>-tagg för att vara klickbart
        const cardLink = document.createElement('a');
        cardLink.href = giveaway.link;
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

        // Knappen är borttagen
        
        content.appendChild(title);
        content.appendChild(description);
        
        card.appendChild(image);
        card.appendChild(content);

        cardLink.appendChild(card);
        container.appendChild(cardLink);
    });
});