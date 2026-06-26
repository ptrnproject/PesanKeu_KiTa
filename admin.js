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
        tr.innerHTML = `
            <td style="text-align: center;"><strong>${String(index + 1).padStart(3, '0')}</strong></td>
            <td><small>${order.tanggal || '-'}</small></td>
            <td><strong>${order.nama || '-'}</strong></td>
            <td>${order.no_hp || '-'}</td>
            <td>${order.alamat || '-'}</td>
            <td style="vertical-align: top;">${rincianMenuHTML}</td>
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

// =========================================================================
// 4. FUNGSI UTAMA B: RENDER JURNAL LAPORAN KEUANGAN & PEMBUKUAN (SELESAI)
// =========================================================================
function renderLaporanKeuangan() {
    const filterBulan = document.getElementById('filterBulan') ? document.getElementById('filterBulan').value : 'all';
    const filterTahun = document.getElementById('filterTahun') ? document.getElementById('filterTahun').value : '2026';
    const financeTableBody = document.getElementById('financeTableBody');
    const omsetHarianContainer = document.getElementById('omsetHarianContainer');
    
    if (!financeTableBody || !omsetHarianContainer) return; 

    financeTableBody.innerHTML = "";
    omsetHarianContainer.innerHTML = "";

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

    const tglSistem = new Date();
    const tahunSistem = tglSistem.getFullYear().toString();
    const batasBulanMaksimal = (filterTahun === tahunSistem) ? (tglSistem.getMonth() + 1) : 12;

    // DATA AUTOMATIC (PESANAN CUSTOMER STATUS SELESAI)
    Object.keys(localOrdersCache).forEach(key => {
        const order = localOrdersCache[key];
        
        if (order.status === "selesai" && order.tanggal) {
            const infoTgl = bersihkanDanPecahTanggal(order.tanggal);
            
            if (infoTgl) {
                if (infoTgl.tahun === filterTahun && (filterBulan === 'all' || infoTgl.bulan === filterBulan)) {
                    
                    let targetMenu = order.menu_order || order.item_keranjang || [];
                    if (targetMenu && typeof targetMenu === 'object' && !Array.isArray(targetMenu)) {
                        targetMenu = Object.keys(targetMenu).map(k => targetMenu[k]);
                    }

                    let rincianMenuHTMLAdmin = `<div style="margin-bottom: 5px; font-weight: bold; color: #1e293b;">Pesanan Selesai an. ${order.nama}</div>`;
                    let arrayRincianTeks = [];

                    if (Array.isArray(targetMenu) && targetMenu.length > 0) {
                        targetMenu.forEach(item => {
                            let teksMenu = "";
                            let teksKustom = "";

                            if (typeof item === 'string') {
                                teksMenu = item;
                                teksKustom = "-";
                            } else {
                                teksMenu = item.menu || "";
                                teksKustom = item.kustomisasi || item.topping || item.rasa || "-";
                            }

                            if (!teksMenu) return;

                            const totalHargaItem = hitungOtomatisHargaTeksMentah(teksMenu, teksKustom);
                            arrayRincianTeks.push(teksMenu);

                            rincianMenuHTMLAdmin += `
                                <div style="font-size: 11px; color: #475569; margin-left: 5px; border-left: 2px solid #cbd5e1; padding-left: 5px; margin-top: 4px;">
                                    ➔ ${teksMenu}
                                    <br>
                                    <span style="color: #64748b;">Total Harga: </span><strong style="color: #0f766e;">Rp ${totalHargaItem.toLocaleString('id-ID')}</strong>
                                </div>
                            `;
                        });
                    }

                    if (!arrayRincianTeks.length && typeof order.menu_order === 'string') {
                        rincianMenuHTMLAdmin = `<div style="font-weight: bold; color: #1e293b;">Pesanan Selesai an. ${order.nama}</div><div style="font-size:11px; color:#475569;">${order.menu_order}</div>`;
                    }

                    let rincianMenuTeks = arrayRincianTeks.length > 0 ? arrayRincianTeks.join(", ") : "Menu tidak terinci";
                    let nominalVal = Number(order.total_bayar) || 0;

                    let itemData = {
                        tanggal: order.tanggal,
                        nama: order.nama,
                        keterangan: `Pesanan Selesai an. ${order.nama} [${rincianMenuTeks}]`,
                        pemasukan: nominalVal
                    };
                    
                    gabunganArusKas.push({
                        isManual: false, 
                        key: key, 
                        tanggal: order.tanggal,
                        kategori: "Pesanan Cust", 
                        keterangan: rincianMenuHTMLAdmin, 
                        pemasukan: nominalVal, 
                        pengeluaran: 0
                    });

                    listPesananSelesaiGlobal.push(itemData);
                    totalPemasukanGlobal += nominalVal;
                    
                    if(infoTgl.hari >= 1 && infoTgl.hari <= 31) {
                        chartDataPemasukan[infoTgl.hari - 1] += nominalVal;
                        omsetMurniCustHarian[infoTgl.hari - 1] += nominalVal;
                    }
                }
            }
        }
    });

    // DATA MANUAL (PENGELUARAN & PEMASUKAN LAIN)
    Object.keys(localFinanceCache).forEach(key => {
        const f = localFinanceCache[key];
        if (f.tanggal) {
            const infoTgl = bersihkanDanPecahTanggal(f.tanggal);
            if (infoTgl && infoTgl.tahun === filterTahun) {
                let lolosFilter = false;
                if (filterBulan === 'all') {
                    if (parseInt(infoTgl.bulan, 10) <= batasBulanMaksimal) lolosFilter = true;
                } else {
                    if (infoTgl.bulan === filterBulan) lolosFilter = true;
                }

                if (lolosFilter) {
                    let pem = 0; let peng = 0; let kat = "Pengeluaran";
                    let nominalVal = Number(f.nominal) || 0;

                    if (f.jenis === 'pemasukan_lain') {
                        pem = nominalVal; kat = "Dana Masuk"; totalPemasukanGlobal += pem;
                        if(infoTgl.hari >= 1 && infoTgl.hari <= 31) chartDataPemasukan[infoTgl.hari - 1] += nominalVal;
                    } else {
                        peng = nominalVal; totalPengeluaranGlobal += peng;
                        if(infoTgl.hari >= 1 && infoTgl.hari <= 31) chartDataPengeluaran[infoTgl.hari - 1] += nominalVal;
                    }

                    gabunganArusKas.push({
                        isManual: true, key: key, tanggal: f.tanggal,
                        kategori: kat, keterangan: `<span style="font-weight:600; color:#1e293b;">${f.keterangan}</span>`, pemasukan: pem, pengeluaran: peng
                    });

                    listTransaksiManualGlobal.push({
                        tanggal: f.tanggal, kategori: kat, keterangan: f.keterangan, pemasukan: pem, pengeluaran: peng
                    });
                }
            }
        }
    });

    // Sortir Arus Kas Tanggal Terbaru ke Terlama
    gabunganArusKas.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    // Render Kalender Grid Visual Mini
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

    // Injeksi Baris Data ke Tabel HTML Jurnal Keuangan Utama
    if (gabunganArusKas.length === 0) {
        financeTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Tidak ada rekaman aktivitas keuangan pada periode ini.</td></tr>`;
    } else {
        gabunganArusKas.forEach(item => {
            const tr = document.createElement('tr');
            const badgeClass = item.pemasukan > 0 ? "badge-pemasukan" : "badge-pengeluaran";
            
            tr.innerHTML = `
                <td style="white-space:nowrap; vertical-align: top;"><small>${item.tanggal}</small></td>
                <td style="vertical-align: top;"><span class="badge ${badgeClass}">${item.kategori.toUpperCase()}</span></td>
                <td style="vertical-align: top; text-align: left;">${item.keterangan}</td>
                <td style="text-align:right; color:#16a34a; font-weight:600; vertical-align: top;">${item.pemasukan > 0 ? 'Rp ' + item.pemasukan.toLocaleString('id-ID') : '-'}</td>
                <td style="text-align:right; color:#dc2626; font-weight:600; vertical-align: top;">${item.pengeluaran > 0 ? 'Rp ' + item.pengeluaran.toLocaleString('id-ID') : '-'}</td>
                <td style="text-align:center; vertical-align: top;">
                    ${item.isManual 
                        ? `<button class="btn-action btn-delete" style="padding:4px 8px; display:inline-block; background:none; border:none; cursor:pointer;" onclick="hapusTransaksiManual('${item.key}')"><i class="fa-solid fa-trash" style="color:#dc2626;"></i></button>` 
                        : `<span style="color:var(--text-muted); font-size:11px; font-style:italic;"><i class="fa-solid fa-robot"></i> Auto Terintegrasi</span>`}
                </td>
            `;
            financeTableBody.appendChild(tr);
        });
    }

    // Sinkronisasi Angka Akhir Ke Widget Card Atas
    if (document.getElementById('reportTotalPemasukan')) {
        document.getElementById('reportTotalPemasukan').innerText = "Rp " + totalPemasukanGlobal.toLocaleString('id-ID');
    }
    if (document.getElementById('reportTotalPengeluaran')) {
        document.getElementById('reportTotalPengeluaran').innerText = "Rp " + totalPengeluaranGlobal.toLocaleString('id-ID');
    }
    
    const saldoAkhir = totalPemasukanGlobal - totalPengeluaranGlobal;
    const saldoEl = document.getElementById('reportSaldoAkhir');
    if (saldoEl) {
        saldoEl.innerText = "Rp " + saldoAkhir.toLocaleString('id-ID');
        saldoEl.style.color = saldoAkhir >= 0 ? "var(--blue)" : "var(--danger)";
    }

    // Gambar Ulang Grafik Garis Chart.js
    const canvasChart = document.getElementById('financeLineChart');
    if (canvasChart) {
        if (myLineChart) { myLineChart.destroy(); }
        const ctx = canvasChart.getContext('2d');
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
}

document.addEventListener('DOMContentLoaded', function() {
    
    // FUNGSI UTAMA UNTUK MENGAMBIL DATA BERSIH (0 sampai 7)
    function getCleanTableData() {
        const originalTable = document.getElementById('tabelPesananUtama');
        const newTable = document.createElement('table');
        
        // Salin baris dan sel hanya sampai kolom ke-7 (Total Tagihan)
        for (let i = 0; i < originalTable.rows.length; i++) {
            const newRow = newTable.insertRow();
            for (let j = 0; j <= 7; j++) { 
                const cell = originalTable.rows[i].cells[j];
                if (cell) {
                    const newCell = newRow.insertCell();
                    newCell.innerHTML = cell.innerHTML;
                }
            }
        }
        return newTable;
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
    if (btnPDF) {
        btnPDF.addEventListener('click', function(e) {
            e.preventDefault();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'mm', 'a4');
            doc.text("Laporan Data Antrean Pesanan", 14, 15);
            
            // Menggunakan tabel bersih yang kita buat di fungsi
            doc.autoTable({ 
                html: getCleanTableData(), 
                startY: 20,
                theme: 'grid'
            });
            doc.save("Data_Antrean_Pesanan.pdf");
        });
    }
});
