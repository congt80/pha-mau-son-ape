
// Import functions from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut,
    createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    onSnapshot, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc,
    serverTimestamp,
    getDoc,
    setDoc,
    writeBatch,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBfCU6zmDk9il-hgsfixbXzIgorIz-iiDs",
  authDomain: "pha-mau-son-apm.firebaseapp.com",
  projectId: "pha-mau-son-apm",
  storageBucket: "pha-mau-son-apm.appspot.com",
  messagingSenderId: "705074828450",
  appId: "1:705074828450:web:f93437c31db9a24ca733fb",
  measurementId: "G-NBBMTHNJSL"
};

// --- QUAN TRỌNG: CÀI ĐẶT QUY TẮC BẢO MẬT (SECURITY RULES) ---
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow list, write: if request.auth != null && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /formulas/{formulaId} {
      allow read, create: if request.auth != null;
      allow update, delete: if request.auth != null && (resource.data.createdBy == request.auth.token.email || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
*/

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- DOM ELEMENT REFERENCES ---
const loadingOverlay = document.getElementById('loading-overlay');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email-display');
const formulaList = document.getElementById('formula-list');
const noResults = document.getElementById('no-results');
const addFormulaBtn = document.getElementById('add-formula-btn');

// Filters
const filterBrand = document.getElementById('filter-brand');
const filterPaintSystem = document.getElementById('filter-paint-system');
const filterModel = document.getElementById('filter-model');
const filterYear = document.getElementById('filter-year');
const filterColorCode = document.getElementById('filter-color-code');

// Modals
const formulaFormModal = document.getElementById('formula-form-modal');
const formulaForm = document.getElementById('formula-form');
const formulaFormTitle = document.getElementById('formula-form-title');
const imagePreview = document.getElementById('image-preview');
const imagePlaceholder = document.getElementById('image-placeholder');
const imageUpload = document.getElementById('image-upload');
const componentsContainer = document.getElementById('components-container');
const addComponentBtn = document.getElementById('add-component-btn');

const detailsModal = document.getElementById('details-modal');
const detailsTitle = document.getElementById('details-title');
const detailsPaintSystem = document.getElementById('details-paint-system');
const detailsYear = document.getElementById('details-year');
const detailsCountry = document.getElementById('details-country');
const detailsImage = document.getElementById('details-image');
const detailsComponentsTable = document.getElementById('details-components-table');
const detailsMetadata = document.getElementById('details-metadata');
const detailsActions = document.getElementById('details-actions');

const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const confirmDeleteMessage = document.getElementById('confirm-delete-message');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// User Management
const userManagementBtn = document.getElementById('user-management-btn');
const searchView = document.getElementById('search-view');
const userManagementView = document.getElementById('user-management-view');
const backToSearchBtn = document.getElementById('back-to-search-btn');
const addUserBtn = document.getElementById('add-user-btn');
const userListTable = document.getElementById('user-list-table');
const userFormModal = document.getElementById('user-form-modal');
const userForm = document.getElementById('user-form');
const userFormTitle = document.getElementById('user-form-title');

// --- GLOBAL STATE ---
let currentUser = null;
let currentUserRole = null;
let formulasUnsubscribe = null;
let usersUnsubscribe = null;
let allFormulas = [];
let currentFormulaId = null;
let currentUserId = null;
let deleteHandler = null;
let newImageFile = null;

// --- INITIAL DATABASE from files ---
const INITIAL_FORMULAS = [
    { brand: "Toyota", paintSystem: "EZ", model: "VIOS", year: "2024-2025", country: "Malaysia", colorCode: "4R0", colorName: "Vàng Cát", components: [ { code: "A381-1842", name: "Màu bạc thưa", weight: 6 }, { code: "A381-1835", name: "Màu bạc chiếu trắng", weight: 19 }, { code: "A381-4554", name: "Màu nâu đậm", weight: 0.9 }, { code: "A381-7400", name: "Màu đen đậm", weight: 0.5 }, { code: "A381-8565", name: "Màu vàng sáng trong", weight: 0.8 }, { code: "A381-5609", name: "Màu đỏ nền tím xanh", weight: 0.2 }, { code: "A381-5643", name: "Màu đỏ tươi", weight: 0.1 }, { code: "A381-0003", name: "Phụ gia tạo nền sáng bạc", weight: 1.5 }, { code: "A381-0089", name: "Phụ gia trong", weight: 2 }, { code: "A381-5608", name: "Màu đỏ marong đậm nền xanh cỏ", weight: 0.1 } ] },
    { brand: "Mitsubishi", paintSystem: "EZ", model: "Pajero sport", year: "2018", country: "Thái Lan", colorCode: "P17", colorName: "Medium Red Pearl", components: [ { code: "A381-5680", name: "Màu đỏ đậm", weight: 53.2 }, { code: "A381-7400", name: "Màu đen đậm", weight: 7.4 }, { code: "A381-5608", name: "Màu đỏ marong đậm nền xanh cỏ", weight: 13.4 }, { code: "A381-5609", name: "Màu đỏ nền tím xanh", weight: 2.1 }, { code: "A381-0248L", name: "Màu camay đỏ", weight: 4.8 }, { code: "A381-0283L", name: "Camay vàng chiếu sáng", weight: 4.4 }, { code: "A381-0003", name: "Phụ gia tạo nền sáng bạc", weight: 4 }, { code: "A381-0002", name: "Phụ gia chỉnh sáng mặt", weight: 13.4 } ] },
    { brand: "Mitsubishi", paintSystem: "EZ", model: "Triton", year: "2022", country: "Thái Lan", colorCode: "W32", colorName: "Trắng Mica", components: [ { code: "A381-6531", name: "Màu trắng tinh", weight: 155 }, { code: "A381-7411", name: "Màu đen mờ", weight: 1.7 }, { code: "A381-4361", name: "Màu vàng lợt", weight: 0.4 }, { code: "A381-7582", name: "Màu đen nền", weight: 1.6 }, { code: "A381-5628", name: "Màu tím đậm", weight: 0.1 }, { code: "A381-2621", name: "Màu xanh dương nền ve", weight: 0.5 } ] },
    { brand: "Wuling", paintSystem: "EZ", model: "Wuling", year: "2023", country: "Trung Quốc", colorCode: "TRẮNG PHẤN HỒNG", colorName: "Trắng phấn hồng", components: [ { code: "A381-6531", name: "Màu trắng tinh", weight: 25 }, { code: "A381-5637", name: "Màu đỏ nền cam hồng", weight: 0.6 }, { code: "A381-7400", name: "Màu đen đậm", weight: 0.1 }, { code: "A381-4361", name: "Màu vàng lợt", weight: 0.3 } ] },
    { brand: "Vinfast", paintSystem: "EZ", model: "VF3", year: "2024", country: "Việt Nam", colorCode: "Hồng nhũ", colorName: "HỒNG NHŨ", components: [ { code: "A381-1843", name: "Màu bạc thưa nhuyễn", weight: 110.5 }, { code: "A381-5609", name: "Màu đỏ nền tím xanh", weight: 12.2 }, { code: "A381-5634", name: "Màu đỏ đậm nền cam", weight: 5.1 }, { code: "A381-0003", name: "Phụ gia tạo nền sáng bạc", weight: 17.6 }, { code: "A381-5680", name: "Màu đỏ đậm", weight: 3 }, { code: "A381-7400", name: "Màu đen đậm", weight: 0.9 }, { code: "A381-1832", name: "Màu bạc sáng mịn", weight: 17.5 } ] },
    { brand: "Vinfast", paintSystem: "EZ", model: "VFe34", year: "2024", country: "Việt Nam", colorCode: "Xanh ngọc", colorName: "Xanh SM", components: [ { code: "A381-6531", name: "Màu trắng tinh", weight: 114 }, { code: "A381-2622", name: "Màu xanh dương nền đỏ", weight: 25.8 }, { code: "A381-2621", name: "Màu xanh dương nền ve", weight: 25.8 }, { code: "A381-0003", name: "Phụ gia tạo nền sáng bạc", weight: 25.8 }, { code: "A381-2619", name: "Màu xanh dương nền tím", weight: 2.6 } ] }
];

// --- HELPER FUNCTIONS ---
const showLoading = () => loadingOverlay.classList.remove('hidden');
const hideLoading = () => loadingOverlay.classList.add('hidden');

const showToast = (message, isError = false) => {
    toastMessage.textContent = message;
    toast.className = `fixed top-5 right-5 text-white py-2 px-5 rounded-lg shadow-md transform transition-transform duration-500 ease-in-out z-50 ${isError ? 'bg-red-600' : 'bg-green-600'}`;
    toast.classList.remove('translate-x-[120%]');
    setTimeout(() => toast.classList.add('translate-x-[120%]'), 3000);
};

const closeAllModals = () => {
    document.querySelectorAll('.fixed.inset-0').forEach(modal => modal.classList.add('hidden'));
};

const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleString('vi-VN');
};

// --- INITIALIZATION & DATA SEEDING ---
async function seedInitialData() {
    const formulasCol = collection(db, "formulas");
    const snapshot = await getDocs(formulasCol);
    if (snapshot.empty) {
        console.log("Database is empty. Seeding initial data...");
        showLoading();
        const batch = writeBatch(db);
        INITIAL_FORMULAS.forEach(formula => {
            const docRef = doc(formulasCol);
            batch.set(docRef, {
                ...formula,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: "system@initial.com",
                lastUpdatedBy: "system@initial.com"
            });
        });
        await batch.commit();
        showToast("Đã thêm dữ liệu mẫu thành công!");
        hideLoading();
    } else {
        console.log("Database already contains data. Skipping seed.");
    }
}

// --- AUTHENTICATION ---
async function handleLogout() {
    await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        showLoading();
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
                currentUserRole = userDoc.data().role;
            } else {
                currentUserRole = 'staff'; 
                await setDoc(userDocRef, { email: user.email, role: 'staff' });
            }
            
            userEmailDisplay.textContent = user.email;
            if (currentUserRole === 'admin') {
                userManagementBtn.classList.remove('hidden');
            }
            
            loginScreen.classList.add('hidden');
            appContainer.classList.remove('hidden');
            
            await seedInitialData(); 
            listenToFormulas();
            if (currentUserRole === 'admin') listenToUsers();
        } catch (error) {
            console.error("Error fetching user role:", error);
            showToast("Lỗi xác thực vai trò người dùng. Vui lòng kiểm tra lại Security Rules trên Firebase.", true);
            handleLogout();
        } finally {
            hideLoading();
        }
    } else {
        currentUser = null;
        currentUserRole = null;
        if (formulasUnsubscribe) formulasUnsubscribe();
        if (usersUnsubscribe) usersUnsubscribe();
        appContainer.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        userManagementBtn.classList.add('hidden');
        userManagementView.classList.add('hidden');
        searchView.classList.remove('hidden');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginError.classList.add('hidden');
    } catch (error) {
        loginError.textContent = "Email hoặc mật khẩu không đúng.";
        loginError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
});

logoutButton.addEventListener('click', handleLogout);

// --- FILTER & RENDER ---
function updateFilterOptions() {
    const filters = [
        { el: filterBrand, key: 'brand', default: 'Tất cả hãng xe' },
        { el: filterPaintSystem, key: 'paintSystem', default: 'Tất cả hệ sơn' },
        { el: filterModel, key: 'model', default: 'Tất cả dòng xe' },
        { el: filterYear, key: 'year', default: 'Tất cả năm' },
        { el: filterColorCode, key: 'colorCode', default: 'Tất cả mã màu' }
    ];

    let filteredData = [...allFormulas];

    for (let i = 0; i < filters.length; i++) {
        const currentFilter = filters[i];
        const selectedValue = currentFilter.el.value;
        
        // Populate current filter's options
        const options = [...new Set(filteredData.map(item => item[currentFilter.key]))].sort();
        currentFilter.el.innerHTML = `<option value="">${currentFilter.default}</option>`;
        options.forEach(opt => {
            currentFilter.el.innerHTML += `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`;
        });

        // Filter data for the next dropdown
        if (selectedValue) {
            filteredData = filteredData.filter(item => item[currentFilter.key] === selectedValue);
        }
    }
    renderFormulas();
}

function listenToFormulas() {
    const formulasCol = collection(db, "formulas");
    formulasUnsubscribe = onSnapshot(formulasCol, (snapshot) => {
        allFormulas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateFilterOptions();
    }, (error) => {
        console.error("Error listening to formulas:", error);
        showToast("Không thể tải dữ liệu công thức.", true);
    });
}

function renderFormulas() {
    formulaList.innerHTML = '';
    const filters = {
        brand: filterBrand.value,
        paintSystem: filterPaintSystem.value,
        model: filterModel.value,
        year: filterYear.value,
        colorCode: filterColorCode.value
    };

    const filtered = allFormulas.filter(f => 
        (!filters.brand || f.brand === filters.brand) &&
        (!filters.paintSystem || f.paintSystem === filters.paintSystem) &&
        (!filters.model || f.model === filters.model) &&
        (!filters.year || f.year === filters.year) &&
        (!filters.colorCode || f.colorCode === filters.colorCode)
    );

    noResults.classList.toggle('hidden', filtered.length > 0);

    filtered.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)).forEach(formula => {
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-shadow duration-300 flex flex-col';
        card.innerHTML = `
            <img class="h-40 w-full object-cover" src="${formula.imageUrl || 'https://placehold.co/600x400/E2E8F0/4A5568?text=No+Image'}" alt="Màu sơn">
            <div class="p-4 flex-grow flex flex-col">
                <p class="text-sm font-semibold text-blue-600">${formula.brand} - ${formula.year}</p>
                <h3 class="font-bold text-lg text-gray-900 mt-1">${formula.model}</h3>
                <p class="text-gray-600 text-sm mt-1 flex-grow">${formula.colorCode} - ${formula.colorName}</p>
                <p class="text-xs text-gray-400 mt-2 text-right">Cập nhật: ${formatDate(formula.updatedAt)}</p>
            </div>
        `;
        card.addEventListener('click', () => showDetailsModal(formula.id));
        formulaList.appendChild(card);
    });
}

[filterBrand, filterPaintSystem, filterModel, filterYear, filterColorCode].forEach(el => el.addEventListener('change', updateFilterOptions));

// --- FORMULA MANAGEMENT (ADD/EDIT) ---
addFormulaBtn.addEventListener('click', () => showFormulaModal());

function addComponentRow(component = { code: '', name: '', weight: '' }) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-8 gap-2 items-center component-row';
    row.innerHTML = `
        <input type="text" value="${component.code}" placeholder="Mã" class="col-span-2 p-2 border rounded-md" data-field="code">
        <input type="text" value="${component.name}" placeholder="Tên màu gốc" class="col-span-4 p-2 border rounded-md" data-field="name">
        <input type="number" step="0.1" value="${component.weight}" placeholder="KL (g)" class="col-span-1 p-2 border rounded-md" data-field="weight">
        <button type="button" class="col-span-1 text-red-500 hover:text-red-700 remove-component-btn">Xóa</button>
    `;
    componentsContainer.appendChild(row);
}

componentsContainer.addEventListener('click', e => {
    if (e.target.classList.contains('remove-component-btn')) {
        e.target.parentElement.remove();
    }
});

addComponentBtn.addEventListener('click', () => addComponentRow());

formulaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();

    let imageUrl = document.getElementById('image-preview').src;
    if (newImageFile) {
        const storageRef = ref(storage, `formulas/${Date.now()}_${newImageFile.name}`);
        try {
            const snapshot = await uploadBytes(storageRef, newImageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Image upload error:", error);
            showToast("Lỗi tải ảnh lên.", true);
            hideLoading();
            return;
        }
    }

    const components = [];
    document.querySelectorAll('.component-row').forEach(row => {
        const code = row.querySelector('[data-field="code"]').value;
        const name = row.querySelector('[data-field="name"]').value;
        const weight = parseFloat(row.querySelector('[data-field="weight"]').value);
        if (code && !isNaN(weight)) {
            components.push({ code, name, weight });
        }
    });

    const formulaData = {
        brand: document.getElementById('brand').value,
        model: document.getElementById('model').value,
        year: document.getElementById('year').value,
        country: document.getElementById('country').value,
        colorCode: document.getElementById('color-code').value,
        colorName: document.getElementById('color-name').value,
        paintSystem: document.getElementById('paint-system').value,
        components: components,
        imageUrl: imageUrl,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: currentUser.email
    };

    try {
        if (currentFormulaId) {
            const formulaRef = doc(db, "formulas", currentFormulaId);
            await updateDoc(formulaRef, formulaData);
            showToast("Cập nhật công thức thành công!");
        } else {
            formulaData.createdAt = serverTimestamp();
            formulaData.createdBy = currentUser.email;
            await addDoc(collection(db, "formulas"), formulaData);
            showToast("Thêm công thức thành công!");
        }
        closeAllModals();
    } catch (error) {
        console.error("Error saving formula:", error);
        showToast("Lỗi lưu công thức.", true);
    } finally {
        hideLoading();
    }
});

function showFormulaModal(id = null) {
    formulaForm.reset();
    imagePreview.classList.add('hidden');
    imagePlaceholder.classList.remove('hidden');
    componentsContainer.innerHTML = '';
    newImageFile = null;
    currentFormulaId = id;
    
    if (id) {
        formulaFormTitle.textContent = "Chỉnh Sửa Công Thức";
        const formula = allFormulas.find(f => f.id === id);
        document.getElementById('brand').value = formula.brand;
        document.getElementById('model').value = formula.model;
        document.getElementById('year').value = formula.year;
        document.getElementById('country').value = formula.country || '';
        document.getElementById('color-code').value = formula.colorCode;
        document.getElementById('color-name').value = formula.colorName;
        document.getElementById('paint-system').value = formula.paintSystem;
        
        formula.components.forEach(c => addComponentRow(c));

        if (formula.imageUrl) {
            imagePreview.src = formula.imageUrl;
            imagePreview.classList.remove('hidden');
            imagePlaceholder.classList.add('hidden');
        }
    } else {
        formulaFormTitle.textContent = "Thêm Công Thức Mới";
        addComponentRow(); // Add one empty row to start
    }
    formulaFormModal.classList.remove('hidden');
}

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        newImageFile = file;
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.classList.remove('hidden');
            imagePlaceholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

function showDetailsModal(id) {
    const formula = allFormulas.find(f => f.id === id);
    currentFormulaId = id;
    detailsTitle.textContent = `${formula.brand} ${formula.model} - ${formula.colorName}`;
    detailsPaintSystem.textContent = formula.paintSystem;
    detailsYear.textContent = formula.year;
    detailsCountry.textContent = formula.country || 'N/A';
    detailsImage.src = formula.imageUrl || '';
    detailsImage.style.display = formula.imageUrl ? 'block' : 'none';
    
    detailsComponentsTable.innerHTML = '';
    if (formula.components && formula.components.length > 0) {
        formula.components.forEach(c => {
            const row = document.createElement('tr');
            row.className = 'border-b';
            row.innerHTML = `
                <td class="px-4 py-2 font-medium text-gray-900">${c.code}</td>
                <td class="px-4 py-2">${c.name || 'N/A'}</td>
                <td class="px-4 py-2 text-right">${c.weight}</td>
            `;
            detailsComponentsTable.appendChild(row);
        });
    }

    detailsMetadata.textContent = `Tạo bởi: ${formula.createdBy || 'N/A'} lúc ${formatDate(formula.createdAt)}. Sửa lần cuối: ${formatDate(formula.updatedAt)} bởi ${formula.lastUpdatedBy || 'N/A'}`;

    detailsActions.innerHTML = '';
    if (currentUserRole === 'admin' || formula.createdBy === currentUser.email) {
        const editBtn = document.createElement('button');
        editBtn.className = 'bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700';
        editBtn.textContent = 'Chỉnh sửa';
        editBtn.onclick = () => { closeAllModals(); showFormulaModal(id); };
        detailsActions.appendChild(editBtn);
    }
    if (currentUserRole === 'admin') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700';
        deleteBtn.textContent = 'Xóa';
        deleteBtn.onclick = () => handleDeleteFormula(id);
        detailsActions.appendChild(deleteBtn);
    }
    
    detailsModal.classList.remove('hidden');
}

function handleDeleteFormula(id) {
    confirmDeleteMessage.textContent = "Bạn có chắc chắn muốn xóa công thức này không? Hành động này không thể hoàn tác.";
    confirmDeleteModal.classList.remove('hidden');
    deleteHandler = async () => {
        showLoading();
        try {
            const formulaToDelete = allFormulas.find(f => f.id === id);
            if (formulaToDelete.imageUrl) {
                try {
                    const imageRef = ref(storage, formulaToDelete.imageUrl);
                    await deleteObject(imageRef);
                } catch (error) {
                    console.warn("Could not delete image from storage:", error.code);
                     if (error.code !== 'storage/object-not-found') throw error;
                }
            }
            await deleteDoc(doc(db, "formulas", id));
            showToast("Xóa công thức thành công!");
        } catch (error) {
            console.error("Error deleting formula:", error);
            showToast("Lỗi xóa công thức.", true);
        } finally {
            closeAllModals();
            hideLoading();
        }
    };
}

// --- USER MANAGEMENT ---
function listenToUsers() {
    const usersCol = collection(db, "users");
    usersUnsubscribe = onSnapshot(usersCol, (snapshot) => {
        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderUsers(users);
    }, (error) => {
        console.error("Error listening to users:", error);
        showToast("Không thể tải danh sách người dùng.", true);
    });
}

function renderUsers(users) {
    userListTable.innerHTML = '';
    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.className = 'bg-white border-b';
        tr.innerHTML = `
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${user.email}</td>
            <td class="px-6 py-4">${user.role}</td>
            <td class="px-6 py-4 text-right">
                <button class="font-medium text-blue-600 hover:underline" data-id="${user.id}">Sửa</button>
            </td>
        `;
        if (user.id !== currentUser.uid) {
            tr.querySelector('td:last-child').innerHTML += ` | <button class="font-medium text-red-600 hover:underline" data-id="${user.id}" data-email="${user.email}">Xóa</button>`;
        }
        userListTable.appendChild(tr);
    });
}

userListTable.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const id = e.target.dataset.id;
        if (e.target.textContent === 'Sửa') {
            showUserModal(id);
        } else if (e.target.textContent === 'Xóa') {
            handleDeleteUser(id, e.target.dataset.email);
        }
    }
});

function showUserModal(id = null) {
    userForm.reset();
    currentUserId = id;
    document.getElementById('user-email-input').disabled = !!id;
    document.getElementById('user-password-input').placeholder = id ? "Để trống nếu không đổi" : "Bắt buộc";
    document.getElementById('user-password-input').required = !id;

    if (id) {
        userFormTitle.textContent = "Chỉnh Sửa User";
        const userDocRef = doc(db, "users", id);
        getDoc(userDocRef).then(userDoc => {
            if(userDoc.exists()){
                const user = userDoc.data();
                document.getElementById('user-email-input').value = user.email;
                document.getElementById('user-role-select').value = user.role;
            }
        });
    } else {
        userFormTitle.textContent = "Thêm User";
    }
    userFormModal.classList.remove('hidden');
}

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    const email = document.getElementById('user-email-input').value;
    const password = document.getElementById('user-password-input').value;
    const role = document.getElementById('user-role-select').value;
    
    try {
        if (currentUserId) {
            const userRef = doc(db, "users", currentUserId);
            await updateDoc(userRef, { role });
            showToast("Cập nhật user thành công!");
        } else {
            const tempApp = initializeApp(firebaseConfig, "tempAppForUserCreation");
            const tempAuth = getAuth(tempApp);
            const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), { email, role });
            await signOut(tempAuth);
            showToast("Tạo user thành công!");
        }
        closeAllModals();
    } catch (error) {
        console.error("Error saving user:", error);
        showToast(`Lỗi: ${error.message}`, true);
    } finally {
        hideLoading();
    }
});

function handleDeleteUser(id, email) {
    confirmDeleteMessage.textContent = `Bạn có chắc muốn xóa user ${email}? Hành động này rất nguy hiểm và không thể hoàn tác.`;
    confirmDeleteModal.classList.remove('hidden');
    deleteHandler = async () => {
        showLoading();
        try {
            await deleteDoc(doc(db, "users", id));
            showToast("Đã xóa user khỏi Firestore. Lưu ý: tài khoản đăng nhập vẫn tồn tại.");
        } catch (error) {
            console.error("Error deleting user doc:", error);
            showToast("Lỗi xóa user.", true);
        } finally {
            closeAllModals();
            hideLoading();
        }
    };
}

// --- UI NAVIGATION & EVENT LISTENERS ---
userManagementBtn.addEventListener('click', () => {
    searchView.classList.add('hidden');
    userManagementView.classList.remove('hidden');
});
backToSearchBtn.addEventListener('click', () => {
    userManagementView.classList.add('hidden');
    searchView.classList.remove('hidden');
});
addUserBtn.addEventListener('click', () => showUserModal());

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});

cancelDeleteBtn.addEventListener('click', closeAllModals);
confirmDeleteBtn.addEventListener('click', () => {
    if (deleteHandler) deleteHandler();
});
    