// ==========================================================================
// 1. INITIALIZATION & VARIABEL GLOBAL KERANJANG
// ==========================================================================
// Amankan array global agar tidak memicu error 'undefined' saat diakses antar fungsi
if (typeof window.keranjangBelanja === 'undefined') {
    window.keranjangBelanja = [];
}

// ==========================================================================
// 2. KONFIGURASI DATABASE CLUMP FIREBASE (REALTIME DATABASE)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDmw1wmqkpSv91vpgybPgWDjZCkhJhIvxo",
    authDomain: "pesankeu-kita.firebaseapp.com",
    databaseURL: "https://pesankeu-kita-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pesankeu-kita",
    storageBucket: "pesankeu-kita.firebasestorage.app",
    messagingSenderId: "659870023155",
    appId: "1:659870023155:web:f4bf13f4c09d175fb92686",
    measurementId: "G-JY50T7TWYL"
};

// Inisialisasi koneksi Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Listen saat halaman selesai dimuat untuk setup event listener awal
document.addEventListener("DOMContentLoaded", () => {
    const pilihanMenuElemen = document.getElementById('pilihanMenu');
    if (pilihanMenuElemen) {
        pilihanMenuElemen.addEventListener('change', handleMenuChange);
    }

    // Render awal untuk memastikan tampilan kosong yang rapi jika belum ada item
    renderKeranjang();
});

// ==========================================================================
// 3. LOGIKA TAMPILAN DINAMIS (MENU & EXTRA VARIATION)
// ==========================================================================
function handleMenuChange() {
    const pilihanMenuElemen = document.getElementById('pilihanMenu');
    if (!pilihanMenuElemen) return; 

    const pilihanMenu = pilihanMenuElemen.value;
    const wrapperLumpia = document.getElementById('wrapperLumpia');
    const wrapperBanana = document.getElementById('wrapperBanana');

    // Sembunyikan semua opsi tambahan terlebih dahulu
    if (wrapperLumpia) wrapperLumpia.style.display = 'none';
    if (wrapperBanana) wrapperBanana.style.display = 'none';

    // Reset semua pilihan kustomisasi ke default agar tidak terbawa ke menu lain
    if (document.getElementById('chkExtraTelor')) document.getElementById('chkExtraTelor').checked = false;
    if (document.getElementById('levelPedas')) document.getElementById('levelPedas').selectedIndex = 0;
    if (document.getElementById('toppingGratis')) document.getElementById('toppingGratis').selectedIndex = 0;
    if (document.getElementById('pilihRasa')) document.getElementById('pilihRasa').selectedIndex = 0;
    if (document.getElementById('chkExtraTopping')) document.getElementById('chkExtraTopping').checked = false;
    if (document.getElementById('dropdownTopping')) document.getElementById('dropdownTopping').style.display = 'none';

    if (!pilihanMenu) return;

    // Tampilkan opsi pelengkap yang sesuai dengan kategori menu yang dipilih
    if (pilihanMenu === 'LUMPIA BEEF') {
        if (wrapperLumpia) wrapperLumpia.style.display = 'block';
    } else if (pilihanMenu.startsWith('BANANA')) {
        if (wrapperBanana) wrapperBanana.style.display = 'block';
    }
}

// Fungsi pembantu untuk toggle tampilan dropdown extra topping (dipanggil via onchange HTML jika ada)
function toggleExtraTopping() {
    const chkExtra = document.getElementById('chkExtraTopping');
    const dropdown = document.getElementById('dropdownTopping');
    if (dropdown) {
        dropdown.style.display = (chkExtra && chkExtra.checked) ? 'block' : 'none';
    }
}

// ==========================================================================
// 4. LOGIKA OPERASIONAL KERANJANG (ADD, RENDER, DELETE, CALCULATE)
// ==========================================================================
function addItemToCart() {
    const menuSelect = document.getElementById('pilihanMenu');
    if (!menuSelect) return;
    
    const namaMenu = menuSelect.value;
    const jumlahPorsiElemen = document.getElementById('jumlahPorsi');
    const jumlahPorsi = jumlahPorsiElemen ? parseInt(jumlahPorsiElemen.value) : 1;

    if (!namaMenu) {
        alert("Silakan pilih menu terlebih dahulu!");
        return;
    }

    let hargaDasar = 0;
    let biayaKustomisasi = 0;
    let detailKustomisasi = "-";
    let namaMenuTampil = namaMenu;

    // A. Perhitungan Harga & Kustomisasi Lumpia Beef
    if (namaMenu === 'LUMPIA BEEF') {
        hargaDasar = 15000;
        namaMenuTampil = "Lumpia Beef";
        const lvlPedasElemen = document.getElementById('levelPedas');
        const lvlPedas = lvlPedasElemen ? lvlPedasElemen.value : "Original";
        const extraTelorElemen = document.getElementById('chkExtraTelor');
        const extraTelor = extraTelorElemen ? extraTelorElemen.checked : false;
        
        detailKustomisasi = `Rasa: ${lvlPedas}`;
        if (extraTelor) {
            biayaKustomisasi = 4000;
            detailKustomisasi += " + Extra Telor";
        }
    } 
    // B. Perhitungan Harga & Kustomisasi Varian Banana
    else if (namaMenu.startsWith('BANANA')) {
        if (namaMenu === 'BANANA ROLL 8') { hargaDasar = 10000; namaMenuTampil = "Banana Roll (Isi 8 Pcs)"; } 
        else if (namaMenu === 'BANANA ROLL 6') { hargaDasar = 7000; namaMenuTampil = "Banana Roll (Isi 6 Pcs)"; } 
        else if (namaMenu === 'BANANA CRISPY 10') { hargaDasar = 12000; namaMenuTampil = "Banana Crispy (Isi 10 Pcs)"; } 
        else if (namaMenu === 'BANANA CRISPY 5') { hargaDasar = 6000; namaMenuTampil = "Banana Crispy (Isi 5 Pcs)"; }

        // 1. Ambil nilai dari input HTML
        const rasaDipilih = document.getElementById('pilihRasa') ? document.getElementById('pilihRasa').value : "Original";
        const topGratis = document.getElementById('toppingGratis') ? document.getElementById('toppingGratis').value : "Original";
        const extraTopping = document.getElementById('chkExtraTopping') ? document.getElementById('chkExtraTopping').checked : false;

        // 2. SUSUN DETAIL KUSTOMISASI (Hanya tulis sekali saja)
        // Awali dengan Rasa dan Topping Gratis
        detailKustomisasi = `Rasa: ${rasaDipilih} | Topping: ${topGratis}`;
        
        // 3. Tambahkan Extra hanya jika dicentang
        if (extraTopping) {
            const topTambahanElemen = document.getElementById('varianTopping');
            const topTambahan = topTambahanElemen ? topTambahanElemen.value : "";
            biayaKustomisasi = 2000;
            // Gunakan += agar teks ini disambung dengan teks sebelumnya, bukan menggantikannya
            detailKustomisasi += ` + Extra Double ${topTambahan}`;
        
        }
    }

    let hargaPerPorsi = hargaDasar + biayaKustomisasi;
    let subtotalCalculated = hargaPerPorsi * jumlahPorsi;

    // Susun objek item baru secara detail (termasuk properti harga & subtotal murni)
    const itemBaru = {
        id: Date.now(),
        menu: namaMenuTampil,
        kustomisasi: detailKustomisasi,
        qty: jumlahPorsi,
        harga: hargaPerPorsi,          // 🌟 Menyimpan data harga satuan murni untuk admin
        subtotal: subtotalCalculated   // 🌟 Menyimpan subtotal murni untuk total belanja
    };

    // Push item baru ke dalam array global pembeli
    window.keranjangBelanja.push(itemBaru);
    
    // Segera update tampilan tabel & angka Rp total di layar
    renderKeranjang();
    
    // Reset form input porsi kembali ke angka default 1
    if (jumlahPorsiElemen) jumlahPorsiElemen.value = 1;
    resetFormMenu();
}

function renderKeranjang() {
    const container = document.getElementById('cartItemsContainer');
    const elTotal = document.getElementById('totalPembayaran');
    
    if (!container) return;
    
    container.innerHTML = "";
    let totalHargaAkhir = 0;

    // Jika keranjang kosong
    if (!window.keranjangBelanja || window.keranjangBelanja.length === 0) {
        container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 15px;">Keranjang masih kosong.</td></tr>`;
        if (elTotal) elTotal.innerText = "Rp 0";
        return;
    }

    // Iterasi array untuk merender baris baru ke dalam tabel keranjang
    window.keranjangBelanja.forEach((item, index) => {
        totalHargaAkhir += item.subtotal;
        
        const barisTabel = document.createElement('tr');
        barisTabel.innerHTML = `
            <td><strong>${item.menu}</strong></td>
            <td><small>${item.kustomisasi || 'Tanpa Request'}</small></td>
            <td style="text-align: center;">${item.qty}x</td>
            <td>Rp ${(item.subtotal || 0).toLocaleString('id-ID')}</td>
            <td style="text-align: center">
                <button type="button" class="btn-danger" style="background: none; border: none; cursor: pointer; font-size: 14px;" onclick="hapusItemKeranjang(${index})">
                    🗑️
                </button>
            </td>
        `;
        container.appendChild(barisTabel);
    });

    // 🎯 Menyuntikkan hasil kalkulasi kumulatif ke dalam elemen teks "Rp 0" di kotak hijau
    if (elTotal) {
        elTotal.innerText = `Rp ${totalHargaAkhir.toLocaleString('id-ID')}`;
    }
}

function hitungTotalBelanja() {
    let total = 0;
    const listBelanja = window.keranjangBelanja || [];
    listBelanja.forEach(item => {
        total += item.subtotal;
    });
    return total;
}

function hapusItemKeranjang(index) {
    if (window.keranjangBelanja && window.keranjangBelanja[index] !== undefined) {
        window.keranjangBelanja.splice(index, 1);
    }
    renderKeranjang();
}

function resetFormMenu() {
    if (document.getElementById('pilihanMenu')) document.getElementById('pilihanMenu').selectedIndex = 0;
    if (document.getElementById('jumlahPorsi')) document.getElementById('jumlahPorsi').value = 1;
    handleMenuChange();
}

// ==========================================================================
// 5. LOGIKA INTEGRASI: CHECKOUT DATA KE FIREBASE REALTIME DATABASE
// ==========================================================================
function submitCheckout() {
    const elNama = document.getElementById('namaCustomer');
    const elHp = document.getElementById('hpCustomer');
    const elAlamat = document.getElementById('alamat'); 
    const elCatatan = document.getElementById('catatanPesanan');

    const nama = elNama ? elNama.value.trim() : "";
    const hp = elHp ? elHp.value.trim() : "";
    const alamat = elAlamat ? elAlamat.value.trim() : ""; 
    const catatan = elCatatan ? elCatatan.value.trim() : "-";

    // Validasi Kelengkapan Identitas Pelanggan di Bagian Depan
    if (nama === "" || hp === "" || alamat === "") {
        alert("Mohon isi Nama, Nomor WhatsApp, dan Alamat Anda terlebih dahulu di Bagian 1!");
        return;
    }

    const targetKeranjang = window.keranjangBelanja || [];
    if (targetKeranjang.length === 0) {
        alert("Keranjang belanja Anda masih kosong! Silakan pilih menu dulu.");
        return;
    }

    // Hitung total final akhir belanjaan untuk dikirim sebagai akumulasi payload cloud
    let totalBayar = hitungTotalBelanja();
    
    // Format tanggal otomatis "DD-MM-YYYY, HH.MM.SS" sesuai standar lokal WIB
    const opsiWaktu = { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const waktuSekarang = new Intl.DateTimeFormat('id-ID', opsiWaktu).format(new Date()).replace(/\//g, '-');

    // Bentuk JSON data struktural payload pesanan murni
    const dataPesananCloud = {
        nama: nama,
        no_hp: hp,
        alamat: alamat, 
        item_keranjang: targetKeranjang, // Menyimpan array item lengkap dengan info subtotal & harga satuan
        catatan: catatan,
        total_bayar: totalBayar,
        tanggal: waktuSekarang,
        status: 'pending'
    };

    // Kirim data pesanan baru ke Firebase Realtime Database
    database.ref('pesanan').push().set(dataPesananCloud)
    .then(() => {
        alert(`Terima kasih Kak ${nama}! Pesanan Anda sudah berhasil dikirim.`);
        
        // Kosongkan kembali isi keranjang belanja pembeli setelah pesanan dikirim
        window.keranjangBelanja = [];
        renderKeranjang();
        
        // Bersihkan seluruh form teks input di layar client pembeli
        if (elNama) elNama.value = "";
        if (elHp) elHp.value = "";
        if (elAlamat) elAlamat.value = "";
        if (elCatatan) elCatatan.value = "";
    })
    .catch((error) => {
        console.error("Firebase Transmit Error: ", error);
        alert("Koneksi gagal! Gagal memproses data pengiriman pesanan.");
    });
}

// ==========================================================================
// FUNGSI PINTU RAHASIA: Login Admin via Klik Judul/Logo
// ==========================================================================
function aksesAdminViaLogo() {
    // Kamu bisa mengganti "adminKiTa123" dengan kata sandi rahasia pilihanmu dan Kiki
    const passwordBenar = "adminKiTa123"; 
    
    const inputPassword = prompt("Masukkan Kata Sandi Panel Admin:");

    if (inputPassword === null) {
        return; // Jika admin menekan tombol 'Cancel'
    }

    if (inputPassword === passwordBenar) {
        // Berikan tiket masuk digital yang berlaku selama tab browser belum ditutup
        sessionStorage.setItem("adminLoggedIn", "true");
        alert("Login Berhasil! Membuka Dashboard Admin...");
        window.location.href = "admin.html"; // Alihkan ke halaman admin
    } else {
        alert("Kata sandi salah! Akses ke panel admin ditolak.");
    }
}

// =========================================================================
// LOGIKA UTAMA: MENYATUKAN DATA PESANAN CUST & KAS MANUAL KE PEMBUKUAN
// =========================================================================
function renderLaporanKeuangan() {
    const filterBulan = document.getElementById('filterBulan').value;
    const filterTahun = document.getElementById('filterTahun').value;
    const financeTableBody = document.getElementById('financeTableBody');
    const omsetHarianContainer = document.getElementById('omsetHarianContainer');
    
    // ✅ PERBAIKAN UTAMA (KATUP PENGAMAN): 
    // Jika halaman HTML belum dimuat atau elemen tidak ditemukan, hentikan fungsi dengan aman 
    // agar tidak memicu eror patah "TypeError: financeTableBody is null" di console.
    if (!financeTableBody || !omsetHarianContainer) {
        console.warn("Wadah tabel keuangan atau omset harian belum siap di HTML.");
        return; 
    }
    
    // Reset tampilan awal setelah dipastikan elemennya ada
    financeTableBody.innerHTML = "";
    omsetHarianContainer.innerHTML = "";

    // Reset variabel global pembukuan
    totalPemasukanGlobal = 0;
    totalPengeluaranGlobal = 0;
    listPesananSelesaiGlobal = [];
    listTransaksiManualGlobal = [];

    let gabunganArusKas = [];
    let chartLabels = [];
    let chartDataPemasukan = new Array(31).fill(0);
    let chartDataPengeluaran = new Array(31).fill(0);
    let omsetMurniCustHarian = new Array(31).fill(0);

    for(let i = 1; i <= 31; i++) chartLabels.push("Tgl " + i);
    
    // ... sisa kode penarikan data Firebase .on('value') Kakak di bawahnya ...
    // -----------------------------------------------------------------
    // BAGIAN A: MENARIK DATA TAB KUST OMATIS YANG STATUSNYA "SELESAI"
    // -----------------------------------------------------------------
    Object.keys(localOrdersCache).forEach(key => {
        const order = localOrdersCache[key];
        
        // Validasi ketat: Hanya menarik pesanan yang berstatus 'selesai'
        if (order.status === "selesai" && order.tanggal) {
            const infoTgl = bersihkanDanPecahTanggal(order.tanggal);
            
            if (infoTgl) {
                // Filter berdasarkan Tahun dan Bulan yang sedang aktif dipilih user
                if (infoTgl.tahun === filterTahun && (filterBulan === 'all' || infoTgl.bulan === filterBulan)) {
                    
                    // 🌟 PERBAIKAN UTAMA: Ambil item_keranjang atau menu_order, lalu susun teks rincian beserta harganya
                    const targetMenu = order.menu_order || order.item_keranjang || [];
                    let arrayRincianTeks = [];

                    targetMenu.forEach(item => {
                        const hargaSatuan = Number(item.harga) || 0;
                        const qty = Number(item.qty) || 1;
                        const subtotalMenu = item.subtotal ? Number(item.subtotal) : (hargaSatuan * qty);

                        // Format: Nama Menu (Qtyx) @Rp Harga -> Rp Subtotal
                        arrayRincianTeks.push(`${item.menu} (${qty}x) [@Rp ${hargaSatuan.toLocaleString('id-ID')} -> Rp ${subtotalMenu.toLocaleString('id-ID')}]`);
                    });

                    // Gabungkan semua menu dengan pemisah koma / baris baru baru
                    let rincianMenu = arrayRincianTeks.length > 0 
                        ? arrayRincianTeks.join(", ") 
                        : "Menu tidak terinci";
                    
                    let nominalVal = Number(order.total_bayar) || 0;

                    // Format objek data khusus arsip eksportir Pesanan Cust
                    let itemData = {
                        tanggal: order.tanggal,
                        nama: order.nama,
                        keterangan: `Pesanan Selesai an. ${order.nama} [${rincianMenu}]`,
                        pemasukan: nominalVal
                    };
                    
                    // Masukkan ke array gabungan pembukuan tabel utama
                    gabunganArusKas.push({
                        isManual: false, 
                        key: key, 
                        tanggal: order.tanggal,
                        kategori: "Pesanan Cust", 
                        keterangan: itemData.keterangan,
                        pemasukan: nominalVal, 
                        pengeluaran: 0
                    });

                    listPesananSelesaiGlobal.push(itemData);
                    totalPemasukanGlobal += nominalVal;
                    
                    // Plotting grafik & grid omset harian
                    if(infoTgl.hari >= 1 && infoTgl.hari <= 31) {
                        chartDataPemasukan[infoTgl.hari - 1] += nominalVal;
                        omsetMurniCustHarian[infoTgl.hari - 1] += nominalVal;
                    }
                }
            }
        }
    });

    // -----------------------------------------------------------------
    // BAGIAN B: MENARIK DATA PEMASUKAN / PENGELUARAN MANUAL
    // -----------------------------------------------------------------
    Object.keys(localFinanceCache).forEach(key => {
        const f = localFinanceCache[key];
        if (f.tanggal) {
            const infoTgl = bersihkanDanPecahTanggal(f.tanggal);

            if (infoTgl) {
                if (infoTgl.tahun === filterTahun && (filterBulan === 'all' || infoTgl.bulan === filterBulan)) {
                    let pem = 0; let peng = 0; let kat = "Pengeluaran";
                    let nominalVal = Number(f.nominal) || 0;

                    if (f.jenis === 'pemasukan_lain') {
                        pem = nominalVal; 
                        kat = "Dana Masuk"; 
                        totalPemasukanGlobal += pem;
                        if(infoTgl.hari >= 1 && infoTgl.hari <= 31) chartDataPemasukan[infoTgl.hari - 1] += nominalVal;
                    } else {
                        peng = nominalVal; 
                        kat = "Pengeluaran";
                        totalPengeluaranGlobal += peng;
                        if(infoTgl.hari >= 1 && infoTgl.hari <= 31) chartDataPengeluaran[infoTgl.hari - 1] += nominalVal;
                    }

                    gabunganArusKas.push({
                        isManual: true, 
                        key: key, 
                        tanggal: f.tanggal,
                        kategori: kat, 
                        keterangan: f.keterangan, 
                        pemasukan: pem, 
                        pengeluaran: peng
                    });

                    listTransaksiManualGlobal.push({
                        tanggal: f.tanggal, kategori: kat, keterangan: f.keterangan, pemasukan: pem, pengeluaran: peng
                    });
                }
            }
        }
    });

    // Urutkan seluruh data (Pesanan Cust + Manual) dari tanggal paling baru
    gabunganArusKas.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // -----------------------------------------------------------------
    // BAGIAN C: RENDER INTEGRASI KE ELEMEN HTML (GRID, TABEL, & CHART)
    // -----------------------------------------------------------------
    
    // 1. Render Grid Pemetaan Omset Penjualan Selesai
    if(filterBulan === 'all') {
        omsetHarianContainer.innerHTML = `<p style="grid-column: 1/-1; text-align: center; font-size:13px; color: var(--text-muted); padding:10px;">Pilih satu bulan spesifik untuk melihat rincian pemetaan omset harian.</p>`;
    } else {
        omsetMurniCustHarian.forEach((nilaiOmset, indeks) => {
            const tanggalHari = indeks + 1;
            const box = document.createElement('div');
            box.className = "omset-box";
            if(nilaiOmset > 0) box.style.borderColor = "var(--purple)";
            box.innerHTML = `
                <div class="tgl-label">Tanggal ${tanggalHari}</div>
                <div class="val-label" style="${nilaiOmset > 0 ? 'color: var(--purple); font-weight:800;' : 'color:#cbd5e1;'}">
                    Rp ${nilaiOmset.toLocaleString('id-ID')}
                </div>
            `;
            omsetHarianContainer.appendChild(box);
        });
    }

    // 2. Cetak Log ke Tabel Arus Kas Jurnal Buku Besar
    if (gabunganArusKas.length === 0) {
        financeTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Tidak ada rekaman aktivitas keuangan pada periode ini.</td></tr>`;
    } else {
       // ... (di atasnya adalah kode filter tanggal dan penarikan data Firebase) ...

    } // 👈 Kurung kurawal penutup akhir fungsi renderLaporanKeuangan() Kakak

    // 3. Kalkulasi Dashboard Box Atas
    document.getElementById('reportTotalPemasukan').innerText = "Rp " + totalPemasukanGlobal.toLocaleString('id-ID');
    document.getElementById('reportTotalPengeluaran').innerText = "Rp " + totalPengeluaranGlobal.toLocaleString('id-ID');
    
    const saldoAkhir = totalPemasukanGlobal - totalPengeluaranGlobal;
    const saldoEl = document.getElementById('reportSaldoAkhir');
    saldoEl.innerText = "Rp " + saldoAkhir.toLocaleString('id-ID');
    saldoEl.style.color = saldoAkhir >= 0 ? "var(--blue)" : "var(--danger)";

    // 4. Update Visual Grafik Garis ChartJS
    if (myLineChart) { myLineChart.destroy(); }
    const ctx = document.getElementById('financeLineChart').getContext('2d');
    myLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Pemasukan/Omset Total (Rp)',
                    data: chartDataPemasukan,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2.5,
                    tension: 0.2,
                    fill: true
                },
                {
                    label: 'Pengeluaran (Rp)',
                    data: chartDataPengeluaran,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    borderWidth: 2.5,
                    tension: 0.2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } },
            scales: {
                y: { beginAtZero: true, ticks: { callback: function(value) { return 'Rp ' + value.toLocaleString('id-ID'); } } }
            }
        }
    });
}

// =========================================================================
// FITUR EKSPOR PDF PROFESIONAL: TERPISAH, BERIKUT NOMOR URUT & TIMESTAMP
// =========================================================================
function exportKePDF() {
    if (listPesananSelesaiGlobal.length === 0 && listTransaksiManualGlobal.length === 0) { 
        alert("Tidak ada data pembukuan pada periode ini untuk diekspor!"); 
        return; 
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // 1. Generate Waktu Cetak & Ekspor Dokumen Real-Time
    const skrg = new Date();
    const stringWaktuCetak = skrg.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) + " - Jam " + skrg.toLocaleTimeString('id-ID') + " WIB";
    const infoPeriode = `Tahun ${document.getElementById('filterTahun').value} / Bulan ${document.getElementById('filterBulan').value}`;

   // 2. Desain Elemen Header / Banner Atas Dokumen
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); 
    doc.text("LAPORAN ARUS KAS PEMBUKUAN - KITA PESANKEU", 14, 15);
    
    // AMBIL NILAI FILTER DAN JADIKAN FORMAT MM/YYYY
    const bulanAngka = document.getElementById('filterBulan').value;
    const tahunAngka = document.getElementById('filterTahun').value;
    const formatPeriodeRingkas = (bulanAngka === 'all') ? `Semua Bulan / ${tahunAngka}` : `${bulanAngka}/${tahunAngka}`;

    doc.setFontSize(9);
    doc.setFont("Helvetica", "normal");
    doc.setFillColor(71, 85, 105);
    // Baris ini yang diubah agar tampilannya bersih
    doc.text(`Periode Laporan : ${formatPeriodeRingkas}`, 14, 21);
    
    // Tercantum waktu kapan PDF di-export secara rinci
    doc.setFont("Helvetica", "oblique");
    doc.setTextColor(100, 116, 139);
    doc.text(`Waktu Eksport Data : ${stringWaktuCetak}`, 14, 26);
    
    // Garis Batas Header
    doc.setDrawColor(46, 204, 113); // Warna hijau aksen brand KiTa
    doc.setLineWidth(0.6);
    doc.line(14, 29, 196, 29); 

    // 3. Ringkasan Total Saldo Finansial Atas
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text("IKHTISAR RINGKASAN SALDO PERIODE INI:", 14, 37);
    
    // =========================================================================
    // 🌟 PERBAIKAN UTAMA: Penyelarasan Titik Dua (:) Menggunakan Kunci Sumbu X
    // =========================================================================
            
    // 1. Baris Total Pemasukan Bersih
    doc.setFont("Helvetica", "normal");
    doc.text("• Total Pemasukan Bersih", 16, 43); // Teks mulai di X = 16
    doc.text(":", 75, 43);                      // Titik dua dikunci di X = 75 🌟
    doc.text(`Rp ${totalPemasukanGlobal.toLocaleString('id-ID')}`, 79, 43); // Angka mulai di X = 79

    // 2. Baris Total Pengeluaran Operasional
    doc.text("• Total Pengeluaran Operasional", 16, 49);
    doc.text(":", 75, 49);                      // Titik dua dikunci di X = 75 🌟
    doc.text(`Rp ${totalPengeluaranGlobal.toLocaleString('id-ID')}`, 79, 49);

    // 3. Baris Saldo Akhir Bersih (Profit Kas)
    doc.setFont("Helvetica", "bold"); // Dipertebal agar kontras
    doc.text("• Saldo Akhir Bersih (Profit Kas)", 16, 55);
    doc.text(":", 75, 55);                      // Titik dua dikunci di X = 75 🌟
    doc.text(`Rp ${(totalPemasukanGlobal - totalPengeluaranGlobal).toLocaleString('id-ID')}`, 79, 55);

    let posisiY_Sekarang = 63;

    // 4. BAGIAN DATA TERPISAH 1: DATA PESANAN CUSTOMER (BERNOMOR)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185); // Aksen Biru Khusus Pesanan Cust
    doc.text("BAGIAN 1: DATA RINCIAN PESANAN CUSTOMER (CLOUD)", 14, posisiY_Sekarang);
    
    const barisTabelPesanan = [];
    // Pemisahan baris data dengan pemberian nomor urut otomatis lewat indeks parameter i
    listPesananSelesaiGlobal.forEach((p, index) => {
        barisTabelPesanan.push([
            (index + 1), // Nomor Urut
            p.tanggal, 
            p.nama, 
            p.keterangan, 
            "Rp " + p.pemasukan.toLocaleString('id-ID')
        ]);
    });

    // Jalankan autoTable khusus data pesanan
    doc.autoTable({
        head: [["No", "Tanggal", "Nama Pelanggan", "Rincian Item Belanja Selesai", "Omset Masuk"]],
        body: barisTabelPesanan,
        startY: posisiY_Sekarang + 4,
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [41, 128, 185] }, // Header Biru
        columnStyles: { 
            0: { halign: 'center', cellWidth: 10 }, // Kolom nomor rata tengah
            4: { halign: 'right' } 
        }
    });

    posisiY_Sekarang = doc.lastAutoTable.finalY + 12;

    // 5. BAGIAN DATA TERPISAH 2: DATA KAS MASUK/KELUAR MANUAL (BERNOMOR)
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(39, 174, 96); // Aksen Hijau Khusus Kas Manual
    doc.text("BAGIAN 2: DATA KAS PEMASUKAN & PENGELUARAN MANUAL", 14, posisiY_Sekarang);

    const barisTabelManual = [];
    // Pemisahan baris kas manual dengan pemberian nomor urut otomatis lewat indeks parameter i
    listTransaksiManualGlobal.forEach((m, index) => {
        barisTabelManual.push([
            (index + 1), // Nomor Urut
            m.tanggal, 
            m.kategori, 
            m.keterangan, 
            m.pemasukan > 0 ? "Rp " + m.pemasukan.toLocaleString('id-ID') : "-",
            m.pengeluaran > 0 ? "Rp " + m.pengeluaran.toLocaleString('id-ID') : "-"
        ]);
    });

    // Jalankan autoTable khusus data transaksi manual operasional ruko
    doc.autoTable({
        head: [["No", "Tanggal", "Kategori Kas", "Deskripsi Keterangan Dana", "Pemasukan", "Pengeluaran"]],
        body: barisTabelManual,
        startY: posisiY_Sekarang + 4,
        styles: { fontSize: 8.5 },
        headStyles: { fillColor: [39, 174, 96] }, // Header Hijau
        columnStyles: { 
            0: { halign: 'center', cellWidth: 10 }, // Kolom nomor rata tengah
            4: { halign: 'right' },
            5: { halign: 'right' } 
        }
    });

    // 6. Cetak/Simpan File PDF otomatis dengan Nama Periode Dinamis
    const bulanNama = document.getElementById('filterBulan').value;
    const tahunNama = document.getElementById('filterTahun').value;
    doc.save(`Laporan_Keuangan_Terpisah_KiTa_Bln_${bulanNama}_Thn_${tahunNama}.pdf`);
}
