const slider = document.getElementById('slider');
let currentIndex = 0;
const totalSlides = 3;

    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalSlides;
        // Geser slider berdasarkan index (0%, 100%, 200%)
        slider.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    // Jalankan setiap 3 detik (3000ms)
    setInterval(nextSlide, 3000);

// Data Produk (Contoh)
let products = JSON.parse(localStorage.getItem('myProducts')) || [
    {
        id: 1,
        name: "Poco X5 5G",
        price: 3200000,
        category: "Gadget",
        image: "https://www.unbox.id/wp-content/uploads/2023/02/Poco-X5-5G_1_1.webp"
    },
    {   
        id: 2,
        name: "NYK Keyboard K-1000",
        price: 250000,
        category: "Gadget",
        image: "https://www.nyk.co.id/wp-content/uploads/2022/08/KX1000.jpg"
    },     
    {
        id: 3,
        name: "Logitech G502 Hero",
        price: 500000,
        category: "Gadget",
        image: "https://resource.logitechg.com/w_776,h_437,ar_16:9,c_fill,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/non-braid/hyjal-g502-hero/2025/g502-hero-mouse-11-programmable-buttons-feature.jpg"
    },
    {
        id: 4,
        name: "Canon EOS 1500D",
        price: 8000000,
        category: "Photography",
        image: "https://gudangkamera.net/img/85e07ded34793d9b1b89acdcce1f906b.jpg"
    },
    {
        id: 5,
        name: "Sony WH-1000XM4",
        price: 3500000,
        category: "Audio",
        image: "https://www.sony.co.id/image/aecb44d1ed9d12d83c2736daa1786b75?fmt=pjpeg&wid=1014&hei=396&bgcolor=F1F5F9&bgc=F1F5F9"

    }
];
// Password admin sederhana
const ADMIN_PASSWORD = "adminhary";
// Simpan data produk ke localStorage setiap kali ada perubahan
function updateLocalStorage() {
    localStorage.setItem('myProducts', JSON.stringify(products));
}

// Fungsi untuk menampilkan produk
const productGrid = document.getElementById('product-grid');

    function displayProducts() {
        productGrid.innerHTML = products.map(product => `
            <div class="bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                <div class="relative overflow-hidden rounded-xl mb-4">
                    <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500">
                    <span class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider text-blue-600">
                        ${product.category}
                    </span>
                </div>
                <h3 class="font-bold text-lg mb-1">${product.name}</h3>
                <p class="text-blue-600 font-extrabold mb-4">Rp ${product.price.toLocaleString('id-ID')}</p>
                    <button onclick="addToCart(${product.id})" class="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah</span>
                    </button>
            </div>
        `).join('');
    }

    // Jalankan fungsi
    displayProducts();

    //Filter Produk Berdasarkan Kategori
    const filterButtons = document.querySelectorAll('[data-filter]'); // Kita akan tambah atribut ini di HTML

    function filterProducts(category, event) {
        // Jika pilih 'Semua', tampilkan semua. Jika tidak, filter berdasarkan kategori.
        const filtered = category === 'all' 
            ? products 
            : products.filter(p => p.category.toLowerCase() === category.toLowerCase());
        
        // Panggil kembali fungsi display dengan data yang sudah difilter
        renderFilteredProducts(filtered);

        // Update tampilan tombol yang aktif
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            // Balikin ke warna default
            btn.classList.remove('bg-blue-100', 'text-blue-600');
            btn.classList.add('hover:bg-gray-100', 'text-gray-600');
        });

        // Set tombol yang dipilih jadi aktif
        const activeBtn = event.currentTarget;
        activeBtn.classList.remove('hover:bg-gray-100', 'text-gray-600');
        activeBtn.classList.add('bg-blue-100', 'text-blue-600');
    }

    // Fungsi pembantu untuk merender ulang grid
    function renderFilteredProducts(data) {
        productGrid.innerHTML = data.map(product => `
            <div class="bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 group">
                <div class="relative overflow-hidden rounded-xl mb-4">
                    <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500">
                    <span class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider text-blue-600">
                        ${product.category}
                    </span>
                </div>
                <h3 class="font-bold text-lg mb-1">${product.name}</h3>
                <p class="text-blue-600 font-extrabold mb-4">Rp ${product.price.toLocaleString('id-ID')}</p>
                    <button onclick="addToCart(${product.id})" class="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Tambah</span>
                    </button>
            </div>
        `).join('');
    }

    // --- FITUR KERANJANG ---
    let cart = [];
    const cartCountElement = document.querySelector('nav .bg-red-500');

    // Fungsi untuk menambah barang ke keranjang
    window.addToCart = function(productId) {
        // 1. Cari data produk berdasarkan ID
        const product = products.find(p => p.id === productId);
        
        if (product) {
            // 2. Masukkan ke array keranjang
            cart.push(product);
            cartCountElement.innerText = cart.length; // Update jumlah di ikon keranjang
            
            // Animasi keranjang
            cartCountElement.classList.add('scale-125');
            setTimeout(() => cartCountElement.classList.remove('scale-125'), 200);

            // Panggil fungsi toast
            showToast(`${product.name} berhasil ditambah!`);
        }
    };

    // Fungsi untuk menampilkan notifikasi (toast)
    function showToast(message) {
        const container = document.getElementById('toast-container');

        //Buat elemen toast
        const toast = document.createElement('div');
        toast.className = 'bg-gray-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 transform transition-all duration-500 translate-y-10 opacity-0 ';
        toast.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="font-medium text-sm">${message}</span>
    `;

    // Masukan ke container
        container.appendChild(toast);

        // Animasi masuk
        setTimeout(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        }, 100);

        // Hapus setelah 3 detik
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => container.removeChild(toast), 500);
        }, 3000);
    }

const cartModal = document.getElementById('cart-modal');
const modalContent = document.getElementById('modal-content');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');

window.toggleCart = function() {
    if (cartModal.classList.contains('hidden')) {
        renderCart(); // Update isinya dulu sebelum dibuka
        cartModal.classList.remove('hidden');
        setTimeout(() => modalContent.classList.remove('translate-x-full'), 10);
    } else {
        modalContent.classList.add('translate-x-full');
        setTimeout(() => cartModal.classList.add('hidden'), 300);
    }
}

function renderCart() {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `<p class="text-center text-gray-400 mt-10">Keranjang masih kosong nih.</p>`;
        cartTotalElement.innerText = "Rp 0";
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="flex items-center space-x-4 bg-gray-50 p-3 rounded-xl">
                <img src="${item.image}" class="w-16 h-16 rounded-lg object-cover">
                <div class="flex-1">
                    <h4 class="font-bold text-sm">${item.name}</h4>
                    <p class="text-blue-600 text-sm font-bold">Rp ${item.price.toLocaleString('id-ID')}</p>
                </div>
                <button onclick="removeFromCart(${index})" class="text-gray-400 hover:text-red-500 transition-colors p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
    }).join('');

    cartTotalElement.innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

window.removeFromCart = function(index) {
    // 1. Hapus item dari array berdasarkan indexnya
    cart.splice(index, 1);
    
    // 2. Update angka di ikon navigasi
    cartCountElement.innerText = cart.length;
    
    // 3. Render ulang isi modal agar tampilannya update
    renderCart();
    
    // 4. Kasih toast biar user tau barang dihapus
    showToast("Barang dihapus dari keranjang");
}

// Checkout button
window.checkout = function() {
    if (cart.length === 0) {
        showToast("Keranjang Mas masih kosong nih!");
    } else {
        // Simulasi proses checkout
        const total = cart.reduce((sum, item) => sum + item.price, 0);
        alert(`Terima kasih Mas Hary! Total belanja Rp ${total.toLocaleString('id-ID')} akan segera diproses.`);
        
        // Kosongkan keranjang setelah belanja
        cart = [];
        cartCountElement.innerText = "0";
        toggleCart(); // Tutup modal
        renderCart(); // Reset tampilan
        showToast("Pesanan berhasil dibuat!");
    }
}

// Fungsi Pindah Halaman
window.showPage = function(page) {
    const shopPage = document.getElementById('shop-page');
    const adminPage = document.getElementById('admin-page');

    if (page === 'admin') {
        const inputPass = prompt("Masukkan Password Admin:");

        // Cek apakah inputan BENAR-BENAR sama dengan ADMIN_PASSWORD
        if (inputPass !== null && inputPass === ADMIN_PASSWORD) {
            // JIKA BENAR: Buka akses
            shopPage.classList.add('hidden');
            adminPage.classList.remove('hidden');
            displayAdminProducts();
            showToast("Akses Diterima, Halo Mas Hary!");
            updateNavUI('admin');
        } else {
            // JIKA SALAH ATAU CANCEL: Tendang balik
            alert("Akses Ditolak! Password salah atau Anda membatalkan login.");
            showPage('shop'); // Paksa balik ke halaman belanja
        }
    } else {
        // Pindah ke halaman shop biasa
        adminPage.classList.add('hidden');
        shopPage.classList.remove('hidden');
        updateNavUI('shop');
    }
};
// Fungsi pembantu biar kode navigasi Mas lebih rapi
function updateNavUI(active) {
    const navShop = document.getElementById('nav-shop');
    const navAdmin = document.getElementById('nav-admin');

    if (active === 'admin') {
        navAdmin.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        navShop.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
    } else {
        navShop.classList.add('bg-white', 'shadow-sm', 'text-blue-600');
        navAdmin.classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
    }
}

// Logika Form Input
const productForm = document.getElementById('product-form');

productForm.addEventListener('submit', function(e) {
    e.preventDefault(); // Biar halaman nggak refresh pas disubmit

    // Ambil data dari input
    const newProduct = {
        id: Date.now(),
        name: document.getElementById('input-name').value,
        price: parseInt(document.getElementById('input-price').value),
        category: document.getElementById('input-category').value,
        image: document.getElementById('input-image').value || "https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=400"
    };

    // Masukkan ke Array produk kita
    products.push(newProduct);

    // Update localStorage
    updateLocalStorage();

    // Render ulang tampilan pembeli
    displayProducts();

    // Reset Form & Notifikasi
    productForm.reset();
    document.getElementById('image-preview-container').classList.add('hidden'); // Sembunyikan preview
    showToast("Produk baru berhasil dipajang!");
    
    // Balik ke halaman belanja otomatis biar kelihatan hasilnya
    setTimeout(() => showPage('shop'), 1000);

});

//Logika preview gambar di form admin
window.previewImage = function() {
    const url = document.getElementById('input-image').value;
    const previewContainer = document.getElementById('image-preview-container');
    const previewImg = document.getElementById('image-preview');

    if (url.trim() !== "") {
        previewImg.src = url;
        previewContainer.classList.remove('hidden');
        
        // Jika link gambar error/salah, sembunyikan lagi
        previewImg.onerror = function() {
            previewContainer.classList.add('hidden');
        };
    } else {
        previewContainer.classList.add('hidden');
    }
}

// Fungsi untuk menampilkan produk di tabel admin
function displayAdminProducts() {
    const adminList = document.getElementById('admin-product-list');
    if (!adminList) return;

    adminList.innerHTML = products.map((product) => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 flex items-center space-x-3">
                <img src="${product.image}" class="w-10 h-10 rounded-lg object-cover">
                <span class="font-medium text-gray-800 text-sm">${product.name}</span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-600">
                Rp ${product.price.toLocaleString('id-ID')}
            </td>
            <td class="px-6 py-4 text-center">
                <button onclick="deleteProduct(${product.id})" class="text-red-400 hover:text-red-600 p-2 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// Fungsi Hapus Produk dari Toko
window.deleteProduct = function(productId) {
    if (confirm("Apakah Mas Hary yakin ingin menghapus produk ini dari etalase?")) {
        // Filter produk, buang yang ID-nya cocok
        products = products.filter(p => p.id !== productId);
        
        // Simpan perubahan ke LocalStorage
        updateLocalStorage();
        
        // Update semua tampilan
        displayProducts();
        displayAdminProducts();
        
        showToast("Produk berhasil dihapus!");
    }
}

// --- PUSAT KONTROL OTOMATIS ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Tampilkan produk di halaman depan
    if (typeof displayProducts === "function") {
        displayProducts();
    }

    // 2. Siapkan tabel di halaman admin (biar pas dibuka sudah ada isinya)
    if (typeof displayAdminProducts === "function") {
        displayAdminProducts();
    }

    // 3. Jalankan slider (jika ada fungsinya)
    // startSlider(); 

    console.log("Sistem Toko Siap, Mas Hary!");
});

// Fungsi Buka/Tutup Modal Checkout
window.toggleCheckout = function() {
    const cartModal = document.getElementById('cart-modal');
    const checkoutModal = document.getElementById('checkout-modal');
    const totalElement = document.getElementById('checkout-total-price');
    
    if (cart.length === 0) {
        showToast("Keranjang Mas masih kosong!");
        return;
    }

    // Hitung total harga keranjang
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    totalElement.innerText = `Rp ${total.toLocaleString('id-ID')}`;

    //Tentukan urutan tampil modal: Jika checkout sudah terbuka, tutup dulu. Kalau belum, buka.
    if (checkoutModal.classList.contains('hidden')) {
        cartModal.classList.add('hidden'); // Pastikan modal keranjang tertutup
        checkoutModal.classList.remove('hidden'); // Buka modal checkout
    } else {
        checkoutModal.classList.add('hidden'); // Tutup modal checkout
    }   
}

// Logika Submit Pesanan
const checkoutForm = document.getElementById('checkout-form');
checkoutForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('buyer-name').value;
    const address = document.getElementById('buyer-address').value;
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    // Simulasi Struk Pembelian
    alert(`
        🎉 PESANAN BERHASIL! 🎉
        -----------------------
        Nama: ${name}
        Alamat: ${address}
        Total Bayar: Rp ${total.toLocaleString('id-ID')}
        -----------------------
        Terima kasih sudah belanja di TOKOBERSAMA!
    `);

    // Reset keranjang setelah belanja
    cart = [];
    updateLocalStorage(); // Simpan perubahan ke localStorage

    //reset tampilan angka di icon
    cartCountElement.innerText = "0";

    //tutup modal checkout
    document.getElementById('checkout-modal').classList.add('hidden');

    //update tampilan keranjang kosong
    renderCart();

    //reset form
    checkoutForm.reset();

    showToast("Pesanan Berhasil!, Terima kasih sudah belanja di TOKOBERSAMA!");
});