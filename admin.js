import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, getDocs, doc, updateDoc, query, where, addDoc, deleteDoc, Timestamp, writeBatch, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function() {

    // --- HTML-ELEMENT ---
    const loginView = document.getElementById('login-view');
    const adminView = document.getElementById('admin-view');
    const loginForm = document.getElementById('admin-login-form');
    const logoutButton = document.getElementById('logout-button');
    const loginError = document.getElementById('login-error');
    const pagesListContainer = document.getElementById('pages-list-container');
    const loadingIndicator = document.getElementById('loading-indicator');
    const addNewPageBtn = document.getElementById('add-new-page-btn');
    // Item Modal
    const itemModal = document.getElementById('item-modal');
    const itemForm = document.getElementById('item-form');
    const modalTitle = document.getElementById('modal-title');
    const closeItemModalBtn = document.getElementById('close-item-modal');
    // Winner Modal
    const winnerModal = document.getElementById('winner-modal');
    const winnerModalTitle = document.getElementById('winner-modal-title');
    const closeWinnerModalBtn = document.getElementById('close-winner-modal');
    const drawView = document.getElementById('draw-view');
    const winnerResultsDiv = document.getElementById('winner-results');
    const winnerListDiv = document.getElementById('winner-list');
    const drawWinnersBtn = document.getElementById('draw-winners-btn');
    const saveWinnersBtn = document.getElementById('save-winners-btn');
    const winnerFeedback = document.getElementById('winner-feedback');
    let drawnWinners = [];

    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = loginForm['email'].value; const password = loginForm['password'].value; signInWithEmailAndPassword(auth, email, password).then(() => { loginError.textContent = ''; }).catch(() => { loginError.textContent = 'Incorrect email or password.'; }); });
    logoutButton.addEventListener('click', () => { signOut(auth); });
    onAuthStateChanged(auth, (user) => { if (user) { loginView.classList.add('hidden'); adminView.classList.remove('hidden'); loadGiveawayPages(); } else { loginView.classList.remove('hidden'); adminView.classList.add('hidden'); } });
    addNewPageBtn.addEventListener('click', addNewPage);
    closeItemModalBtn.addEventListener('click', () => itemModal.style.display = 'none');
    closeWinnerModalBtn.addEventListener('click', () => winnerModal.style.display = 'none');
    drawWinnersBtn.addEventListener('click', drawWinners);
    saveWinnersBtn.addEventListener('click', saveWinners);
    itemForm.addEventListener('submit', handleItemFormSubmit);

    // --- PAGE MANAGEMENT ---
    async function addNewPage() {
        try {
            const newPageRef = await addDoc(collection(db, "giveawayPages"), {
                title: "New Blank Page",
                pageType: "guide",
                description: "A short description for the card on the main page.",
                content: "# New Guide\n\nStart writing your content here.",
                image: "https://via.placeholder.com/300x180.png?text=New+Page",
                pageBackground: "#1a1a1a",
                isActive: false,
                order: 99
            });
            await updateDoc(newPageRef, { pageId: newPageRef.id });
            loadGiveawayPages();
        } catch (error) {
            console.error("Error adding new page: ", error);
        }
    }

    async function loadGiveawayPages() {
        loadingIndicator.classList.remove('hidden');
        pagesListContainer.innerHTML = '';
        try {
            const q = query(collection(db, "giveawayPages"), orderBy("order"));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                pagesListContainer.innerHTML = '<p>No pages found.</p>';
            } else {
                querySnapshot.forEach(doc => {
                    const pageData = doc.data();
                    const pageId = doc.id;
                    const pageCard = document.createElement('div');
                    pageCard.className = 'page-card';
                    pageCard.setAttribute('data-id', pageId);
                    pageCard.innerHTML = `
                        <div class="header">
                            <span class="drag-handle">⠿</span>
                            <h4>Page: ${pageData.title}</h4>
                        </div>
                        <label for="pageType-${pageId}">Page Type:</label>
                        <select id="pageType-${pageId}" data-id="${pageId}" class="page-type-selector">
                            <option value="giveaway" ${pageData.pageType === 'giveaway' ? 'selected' : ''}>Giveaway</option>
                            <option value="guide" ${pageData.pageType === 'guide' ? 'selected' : ''}>Guide</option>
                        </select>
                        <label for="title-${pageId}">Title:</label>
                        <input type="text" id="title-${pageId}" value="${pageData.title}">
                        <label for="desc-${pageId}">Card Description (for main page):</label>
                        <textarea id="desc-${pageId}" rows="3">${pageData.description || ''}</textarea>
                        <label for="image-${pageId}">Card Image URL:</label>
                        <input type="text" id="image-${pageId}" value="${pageData.image || ''}">
                        <div class="guide-fields ${pageData.pageType !== 'guide' ? 'hidden' : ''}">
                            <label for="content-${pageId}">Content:</label>
                            <textarea id="content-${pageId}" class="tinymce-editor" rows="15">${pageData.content || ''}</textarea>
                            <label for="background-${pageId}">Page Background (color or url):</label>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="text" id="background-${pageId}" value="${pageData.pageBackground || ''}">
                                <input type="color" class="color-picker" data-target="background-${pageId}" value="${(pageData.pageBackground || '').startsWith('#') ? pageData.pageBackground : '#1a1a1a'}">
                            </div>
                        </div>
                        <div class="giveaway-fields ${pageData.pageType !== 'giveaway' ? 'hidden' : ''}">
                            <div class="items-section">
                                <h5>Giveaway Items on this page:</h5>
                                <div class="items-list" id="items-list-${pageId}"></div>
                                <button class="add-item-btn" data-page-id="${pageId}">+ Add New Item</button>
                            </div>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="isActive-${pageId}" ${pageData.isActive ? 'checked' : ''}>
                            <label for="isActive-${pageId}">Active (show on homepage)</label>
                        </div>
                        <button class="save-page-btn" data-id="${pageId}">Save Changes</button>
                        <span id="feedback-${pageId}" style="margin-left: 10px; color: lightgreen;"></span>
                    `;
                    pagesListContainer.appendChild(pageCard);
                    if (pageData.pageType === 'giveaway') {
                        loadItemsForPage(pageId);
                    }
                });
                initializeTinyMCE();
                addPageTypeSelectorListeners();
                addColorPickerListeners();
                addSaveButtonListeners();
                addAddItemButtonListeners();
                initializeSortable();
            }
        } catch (error) {
            console.error("Error fetching pages: ", error);
            pagesListContainer.innerHTML = '<p style="color: red;">Could not load pages from database.</p>';
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    function initializeTinyMCE() {
        tinymce.remove('.tinymce-editor');
        tinymce.init({
            selector: '.tinymce-editor',
            plugins: 'image link lists media autoresize code',
            toolbar: 'undo redo | bold italic underline | blocks | alignleft aligncenter alignright | bullist numlist | link image media | code',
            skin: 'oxide-dark',
            content_css: 'dark',
            height: 500,
            image_advtab: true,
            paste_data_images: true,
	    onboarding: false
        });
    }

    function initializeSortable() {
        const el = document.getElementById('pages-list-container');
        new Sortable(el, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: saveNewOrder
        });
    }

    async function saveNewOrder() {
        const pageCards = document.querySelectorAll('#pages-list-container .page-card');
        const batch = writeBatch(db);
        pageCards.forEach((card, index) => {
            const pageId = card.dataset.id;
            if (pageId) {
                const docRef = doc(db, "giveawayPages", pageId);
                batch.update(docRef, { order: index });
            }
        });
        try {
            await batch.commit();
            console.log("New order saved!");
        } catch (error) {
            console.error("Could not save new order: ", error);
        }
    }

    function addPageTypeSelectorListeners() {
        document.querySelectorAll('.page-type-selector').forEach(selector => {
            selector.addEventListener('change', (e) => {
                const pageCard = e.target.closest('.page-card');
                const guideFields = pageCard.querySelector('.guide-fields');
                const giveawayFields = pageCard.querySelector('.giveaway-fields');
                if (e.target.value === 'guide') {
                    guideFields.classList.remove('hidden');
                    giveawayFields.classList.add('hidden');
                } else {
                    guideFields.classList.add('hidden');
                    giveawayFields.classList.remove('hidden');
                }
            });
        });
    }

    function addColorPickerListeners() {
        document.querySelectorAll('.color-picker').forEach(picker => {
            picker.addEventListener('input', (e) => {
                const targetId = e.target.dataset.target;
                document.getElementById(targetId).value = e.target.value;
            });
        });
    }

    function addSaveButtonListeners() {
        document.querySelectorAll('.save-page-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const pageId = e.target.dataset.id;
                const feedbackSpan = document.getElementById(`feedback-${pageId}`);
                feedbackSpan.textContent = 'Saving...';
                const dataToSave = {
                    pageType: document.getElementById(`pageType-${pageId}`).value,
                    title: document.getElementById(`title-${pageId}`).value,
                    description: document.getElementById(`desc-${pageId}`).value,
                    image: document.getElementById(`image-${pageId}`).value,
                    isActive: document.getElementById(`isActive-${pageId}`).checked
                };
                if (dataToSave.pageType === 'guide') {
                    const editor = tinymce.get(`content-${pageId}`);
                    if (editor) {
                        dataToSave.content = editor.getContent();
                    }
                    dataToSave.pageBackground = document.getElementById(`background-${pageId}`).value;
                }
                const pageRef = doc(db, "giveawayPages", pageId);
                try {
                    await updateDoc(pageRef, dataToSave);
                    feedbackSpan.textContent = 'Saved!';
                } catch (error) {
                    feedbackSpan.textContent = 'Error saving.';
                    feedbackSpan.style.color = 'red';
                }
                setTimeout(() => {
                    feedbackSpan.textContent = '';
                }, 3000);
            });
        });
    }

    // --- ITEM MANAGEMENT ---
    async function loadItemsForPage(pageId) {
        const itemsListContainer = document.getElementById(`items-list-${pageId}`);
        if (!itemsListContainer) return;
        const q = query(collection(db, "giveawayItems"), where("pageId", "==", pageId));
        try {
            const querySnapshot = await getDocs(q);
            itemsListContainer.innerHTML = '';
            if (querySnapshot.empty) {
                itemsListContainer.innerHTML = '<p>No items have been added.</p>';
            } else {
                querySnapshot.forEach(itemDoc => {
                    const itemData = itemDoc.data();
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'item-listing';
                    let buttonsHTML = itemData.status === 'closed' ?
                        `<button class="btn-view-winners" data-item-id="${itemDoc.id}" data-item-title="${itemData.title}">View Winners</button><button class="btn-delete" data-item-id="${itemDoc.id}" data-page-id="${pageId}">Delete (Archive)</button>` :
                        `<button class="btn-draw" data-item-id="${itemDoc.id}" data-item-title="${itemData.title}">Draw Winners</button><button class="btn-edit" data-item-id="${itemDoc.id}" data-page-id="${pageId}">Edit</button><button class="btn-delete" data-item-id="${itemDoc.id}" data-page-id="${pageId}">Delete</button>`;
                    itemDiv.innerHTML = `<span>${itemData.title}</span><div>${buttonsHTML}</div>`;
                    itemsListContainer.appendChild(itemDiv);
                });
            }
            addEventListenersForItemButtons(pageId);
        } catch (error) {
            console.error("Error fetching items: ", error);
            itemsListContainer.innerHTML = 'Could not load items.';
        }
    }

    function addAddItemButtonListeners() {
        document.querySelectorAll('.add-item-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const pageId = e.target.dataset.pageId;
                modalTitle.textContent = "Add New Item";
                itemForm.reset();
                document.getElementById('modal-page-id').value = pageId;
                document.getElementById('modal-item-id').value = '';
                itemModal.style.display = 'flex';
            });
        });
    }

    function addEventListenersForItemButtons(pageId) {
        const listContainer = document.querySelector(`#items-list-${pageId}`);
        if (!listContainer) return;
        listContainer.addEventListener('click', async (e) => {
            const target = e.target;
            const itemId = target.dataset.itemId;
            if (!itemId) return;
            if (target.classList.contains('btn-edit')) {
                const docRef = doc(db, "giveawayItems", itemId);
                const docSnap = await getDoc(docRef);
                const itemData = docSnap.data();
                modalTitle.textContent = "Edit Item";
                itemForm.reset();
                document.getElementById('modal-page-id').value = pageId;
                document.getElementById('modal-item-id').value = itemId;
                document.getElementById('item-title').value = itemData.title;
                document.getElementById('item-description').value = itemData.description;
                document.getElementById('item-image').value = itemData.imageURL || '';
                document.getElementById('item-modalText').value = itemData.modalText;
                document.getElementById('item-startTime').value = itemData.startTime.toDate().toISOString().slice(0, 16);
                document.getElementById('item-endTime').value = itemData.endTime.toDate().toISOString().slice(0, 16);
                itemModal.style.display = 'flex';
            } else if (target.classList.contains('btn-delete')) {
                const docRef = doc(db, "giveawayItems", itemId);
                const docSnap = await getDoc(docRef);
                if (docSnap.data().status === 'closed') {
                    if (confirm('This item has drawn winners. Do you want to archive it before deleting?')) {
                        const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
                        const winnersSnapshot = await getDocs(winnersQuery);
                        const winnersData = winnersSnapshot.docs.map(d => d.data());
                        await addDoc(collection(db, "archivedGiveaways"), { ...docSnap.data(),
                            archivedAt: Timestamp.now(),
                            winners: winnersData
                        });
                        await deleteDoc(docRef);
                        alert('Item and winners have been archived and deleted.');
                        loadItemsForPage(pageId);
                    }
                } else {
                    if (confirm('Are you sure you want to delete this item?')) {
                        await deleteDoc(docRef);
                        loadItemsForPage(pageId);
                    }
                }
            } else if (target.classList.contains('btn-draw')) {
                openWinnerModal(itemId, target.dataset.itemTitle);
            } else if (target.classList.contains('btn-view-winners')) {
                winnerFeedback.textContent = 'Fetching winners...';
                winnerModalTitle.textContent = `Winners for: ${target.dataset.itemTitle}`;
                drawView.classList.add('hidden');
                winnerResultsDiv.classList.remove('hidden');
                saveWinnersBtn.classList.add('hidden');
                const winnersQuery = query(collection(db, "winners"), where("itemId", "==", itemId));
                const winnersSnapshot = await getDocs(winnersQuery);
                const winnerNames = winnersSnapshot.docs.map(d => d.data().username);
                winnerListDiv.innerHTML = winnerNames.map(name => `<p>${name}</p>`).join('') || "<p>No winners found.</p>";
                winnerFeedback.textContent = '';
                winnerModal.style.display = 'flex';
            }
        });
    }

    async function handleItemFormSubmit(e) {
        e.preventDefault();
        const pageId = document.getElementById('modal-page-id').value;
        const itemId = document.getElementById('modal-item-id').value;
        const data = {
            pageId: pageId,
            title: document.getElementById('item-title').value,
            description: document.getElementById('item-description').value,
            imageURL: document.getElementById('item-image').value,
            modalText: document.getElementById('item-modalText').value,
            startTime: Timestamp.fromDate(new Date(document.getElementById('item-startTime').value)),
            endTime: Timestamp.fromDate(new Date(document.getElementById('item-endTime').value))
        };
        if (itemId) {
            await updateDoc(doc(db, "giveawayItems", itemId), data);
        } else {
            await addDoc(collection(db, "giveawayItems"), data);
        }
        itemModal.style.display = 'none';
        loadItemsForPage(pageId);
    }

    // --- WINNER DRAWING ---
    function openWinnerModal(itemId, itemTitle) {
        winnerModalTitle.textContent = `Draw winners for: ${itemTitle}`;
        document.getElementById('winner-modal-item-id').value = itemId;
        drawView.classList.remove('hidden');
        winnerResultsDiv.classList.add('hidden');
        saveWinnersBtn.classList.remove('hidden');
        winnerListDiv.innerHTML = '';
        winnerFeedback.textContent = '';
        document.getElementById('winner-count').value = 1;
        drawnWinners = [];
        winnerModal.style.display = 'flex';
    }

    async function drawWinners() {
        const itemId = document.getElementById('winner-modal-item-id').value;
        const winnerCount = parseInt(document.getElementById('winner-count').value);
        winnerFeedback.textContent = 'Fetching participants...';
        drawnWinners = [];
        const submissionsRef = collection(db, "giveawayItems", itemId, "submissions");
        const snapshot = await getDocs(submissionsRef);
        const participants = snapshot.docs.map(doc => doc.data().username);
        if (participants.length === 0) {
            winnerFeedback.textContent = 'No participants!';
            return;
        }
        winnerFeedback.textContent = `${participants.length} participants found. Drawing...`;
        const shuffled = participants.sort(() => 0.5 - Math.random());
        drawnWinners = shuffled.slice(0, winnerCount);
        winnerListDiv.innerHTML = '';
        if (drawnWinners.length > 0) {
            drawnWinners.forEach(winner => {
                const p = document.createElement('p');
                p.textContent = winner;
                winnerListDiv.appendChild(p);
            });
            winnerResultsDiv.classList.remove('hidden');
            winnerFeedback.textContent = 'Draw complete!';
        } else {
            winnerFeedback.textContent = 'Could not draw winners.';
        }
    }

    async function saveWinners() {
        const itemId = document.getElementById('winner-modal-item-id').value;
        const itemTitle = winnerModalTitle.textContent.replace('Draw winners for: ', '');
        if (drawnWinners.length === 0) {
            alert('No winners to save.');
            return;
        }
        winnerFeedback.textContent = 'Saving...';
        try {
            const batch = writeBatch(db);
            drawnWinners.forEach(winnerUsername => {
                const winnerRef = doc(collection(db, "winners"));
                batch.set(winnerRef, {
                    itemId: itemId,
                    itemTitle: itemTitle,
                    username: winnerUsername,
                    drawnAt: Timestamp.now()
                });
            });
            const itemRef = doc(db, "giveawayItems", itemId);
            batch.update(itemRef, {
                status: "closed"
            });
            await batch.commit();
            winnerFeedback.textContent = 'Winners have been saved!';
            setTimeout(() => {
                winnerModal.style.display = 'none';
                loadGiveawayPages();
            }, 2000);
        } catch (error) {
            console.error("Error saving winners: ", error);
            winnerFeedback.textContent = 'An error occurred while saving.';
            winnerFeedback.style.color = 'red';
        }
    }

});