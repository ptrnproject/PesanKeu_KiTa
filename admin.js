alert("admin.js berhasil dimuat!");
console.log("admin.js berhasil dimuat dan siap digunakan.");
// =========================================================================
// 1. VARIABEL GLOBAL PEMBUKUAN & CACHE DATA
// =========================================================================
let localOrdersCache = {};         // Menyimpan data pesanan dari Firebase
let localFinanceCache = {};        // Menyimpan data transaksi keuangan manual
let myLineChart = null;            // Menyimpan objek grafik Chart.js

let totalPemasukanGlobal = 0;
let totalPengeluaranGlobal = 0;
let listPesananSelesaiGlobal = [];
let listTransaksiManualGlobal = [];

// KAMUS HARGA OTOMATIS: Penyelamat jika data keranjang dari pembeli kosong harganya
const daftarHargaMenu = {
    "Lumpia Beef": 15000,
    "LUMPIA BEEF": 15000,
    "Banana Roll (Isi 8 Pcs)": 10000,
    "Banana Roll (Isi 6 Pcs)": 7000,
    "Banana Crispy (Isi 12 Pcs)": 12000,
    "Banana Crispy (Isi 5 Pcs)": 6000
};

// =========================================================================
// 2. INITIALIZATION / KETIKA HALAMAN SELESAI DIMUAT
// =========================================================================
document.addEventListener("DOMContentLoaded", () => {
    const filterBulan = document.getElementById('filterBulan');
    const filterTahun = document.getElementById('filterTahun');

    if (filterBulan) filterBulan.addEventListener('change', jalankanRenderSesuaiTab);
    if (filterTahun) filterTahun.addEventListener('change', jalankanRenderSesuaiTab);
});

function jalankanRenderSesuaiTab() {
    renderOrdersTable();
    renderLaporanKeuangan();
}

function bersihkanDanPecahTanggal(teksTanggal) {
    if (!teksTanggal) return null;
    try {
        const hanyaTanggal = teksTanggal.split(',')[0].trim(); 
        const part = hanyaTanggal.split('-'); 
        if (part.length === 3) {
            return {
                hari: parseInt(part[0], 10),
                bulan: part[1], 
                tahun: part[2]  
            };
        }
    } catch (e) {
        console.error("Gagal memecah tanggal:", e);
    }
    return null;
}

// 🌟 FUNGSI SCANNER CERDAS UNTUK MENGHITUNG TEKS MENTAH DARI FIREBASE KAKAK
function hitungOtomatisHargaTeksMentah(namaMenuTeks, kustomisasiTeks) {
    let hargaDasar = 0;
    let qty = 1;

    // 1. Cari kecocokan nama menu di dalam kamus harga
    Object.keys(daftarHargaMenu).forEach(namaMenuKamus => {
        if (namaMenuTeks.toLowerCase().includes(namaMenuKamus.toLowerCase())) {
            hargaDasar = daftarHargaMenu[namaMenuKamus];
        }
    });

    // 2. Scan Qty (Mencari pola seperti (1x), (2x), dst)
    const matchQty = namaMenuTeks.match(/\((\d+)x\)/);
    if (matchQty && matchQty[1]) {
        qty = parseInt(matchQty[1], 10);
    }

    // 3. Scan Kustomisasi / Topping tambahan biaya
    let totalHargaSatuan = hargaDasar + biayaKustomisasi;

    return totalHargaSatuan * qty;
}

// =========================================================================
// 3. FUNGSI UTAMA A: RENDER LOG ANTREAN (UNTUK STATUS PENDING / PROSES)
// =========================================================================
function renderOrdersTable() {
    const adminTableBody = document.getElementById('adminTableBody');
    if (!adminTableBody) return;
    
    // 1. Kosongkan tabel terlebih dahulu
    adminTableBody.innerHTML = "";

    // 2. Loop data yang ingin ditampilkan (gunakan `localOrdersCache` sebagai sumber data)
    Object.keys(localOrdersCache).forEach((key, index) => {
        const order = localOrdersCache[key];   
        
        // Rincian menu disiapkan di sini agar rapi
        const rincianMenuHTML = `
            <div style="white-space: pre-line; font-size: 13px; color: #334155;">
                ${order.menu_order || '-'}
            </div>
        `;

        const tr = document.createElement('tr');
        const [tgl, jam] = (order.tanggal || "- -").split(" ");
        // GANTI BAGIAN INI DI admin.js
        tr.innerHTML = `
            <td style="text-align: center;">${String(index + 1).padStart(3, '0')}</td>
            <td>
                <div class="date-container">
                    <span class="d-block">${tgl}</span>
                    <small class="d-block text-muted">${jam}</small>
                </div>
            </td>
            <td><strong>${order.nama || '-'}</strong></td>
            <td>${order.no_hp || '-'}</td>
            <td>${order.alamat || '-'}</td> 
            <td data-pdf-text="${pdfItemsText.trim()}"><ul class="table-item-list">${itemsLi}</ul></td>
            <td><small style="color:#b45309;">${order.catatan || '-'}</small></td>
            <td style="font-weight: bold; color: #16a34a;">Rp ${(Number(order.total_bayar) || 0).toLocaleString('id-ID')}</td>
            <td>
                <span class="badge" style="background-color: ${order.status === 'PENDING' ? '#f59e0b' : '#3b82f6'}; color: white; padding: 4px 8px; border-radius: 4px;">
                    ${(order.status || 'PENDING').toUpperCase()}
                </span>
            </td>
            <td style="text-align: center;">
                <button onclick="ubahStatusSelesai('${key}')" style="background:#16a34a; color:white; border:none; padding:5px 10px; cursor:pointer;">✔ Selesai</button>
            </td>
        `;
        adminTableBody.appendChild(tr);
    });
}


document.addEventListener('DOMContentLoaded', function() {
    
    // FUNGSI UTAMA UNTUK MENGAMBIL DATA BERSIH (0 sampai 7)
    // GANTI FUNGSI INI
    function getCleanTableData() {
        const originalTable = document.getElementById('tabelPesananUtama');
        let data = [];
        
        for (let i = 0; i < originalTable.rows.length; i++) {
            let row = [];
            for (let j = 0; j <= 7; j++) {
                let cell = originalTable.rows[i].cells[j];
                let text = cell ? cell.innerText.trim() : "";
                
                // Logika khusus untuk kolom Rincian Menu (indeks 5)
                if (j === 5) {
                    // Memasukkan spasi sebelum kata yang diawali huruf kapital (seperti "Banana" setelah "19.000")
                    text = text.replace(/([0-9])([A-Z])/g, '$1\n$2');
                }
                
                row.push(text);
            }
            data.push(row);
        }
        return data;
    }

    // EVENT LISTENER EXCEL
    const btnExcel = document.getElementById('btnExportExcel');
    if (btnExcel) {
        btnExcel.addEventListener('click', function(e) {
            e.preventDefault();
            const cleanTable = getCleanTableData();
            const wb = XLSX.utils.table_to_book(cleanTable, {sheet: "Data Antrean"});
            XLSX.writeFile(wb, "Data_Antrean_Pesanan.xlsx");
        });
    }

    // EVENT LISTENER PDF
    const btnPDF = document.getElementById('btnExportPDF');
    // EVENT LISTENER PDF
    if (btnPDF) {
        btnPDF.addEventListener('click', function(e) {
            e.preventDefault();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            
            doc.text("Laporan Data Antrean Pesanan", 14, 15);
            
            const rawData = getCleanTableData();
            const headers = rawData[0]; // Baris pertama adalah header
            const body = rawData.slice(1); // Sisanya adalah isi data

            doc.autoTable({ 
                head: [rawData[0]],
                body: rawData.slice(1),
                startY: 20,
                theme: 'grid',
                styles: { fontSize: 8, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 25 }, // Lebar kolom Tanggal
                    2: { cellWidth: 25 }, // Lebar kolom Nama
                    5: { cellWidth: 60 }  // Lebar kolom Rincian Menu
                }
            });
            doc.save("Data_Antrean_Pesanan.pdf");
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // Menghubungkan tombol Export PDF
    document.getElementById('btnExportPDF').addEventListener('click', function() {
        // Panggil fungsi PDF yang sudah kita buat sebelumnya
        exportPDF(); 
    });

    // Menghubungkan tombol Export Excel
    document.getElementById('btnExportExcel').addEventListener('click', function() {
        // Panggil fungsi Excel Anda
        exportExcel(); 
    });
});

function formatDeskripsiArusKas(rawText) {
    if (!rawText || !rawText.includes("Pesanan Selesai")) return rawText;

    // 1. Coba ambil teks di dalam kurung siku
    const match = rawText.match(/\[(.*?)\]/);
    
    // Jika tidak ada kurung siku, kita pecah berdasarkan koma (asumsi item dipisah koma)
    let items = [];
    let header = rawText;
    
    if (match) {
        header = rawText.split(' [')[0];
        items = match[1].split(/\], ?/); // Pemisah item
    } else {
        // Fallback: Jika tidak ada kurung siku, coba pecah berdasarkan koma
        items = rawText.replace("Pesanan Selesai an. ", "").split(', ');
    }

    // 2. Bangun HTML
    let html = `<strong>${header}</strong><ul style="margin: 5px 0 0 0; padding-left: 20px;">`;
    items.forEach(item => {
        let clean = item.replace(/\[@Rp \d+[\d.]* -> Rp \d+[\d.]*\]/g, '').replace(']', '').trim();
        if (clean) {
            html += `<li style="margin-bottom: 2px;">${clean}</li>`;
        }
    });
    html += '</ul>';
    
    return html;
}
