document.addEventListener("DOMContentLoaded", () => {

const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImI5MDI3YjY3LWFmNjctNDdjOS04Yzk5LTIxOGNiYjJiYjM3OSIsIm9yZ0lkIjoiNTA2MzI5IiwidXNlcklkIjoiNTIwOTgzIiwidHlwZSI6IlBST0pFQ1QiLCJ0eXBlSWQiOiIxODQ0OTQ3Yi0yMjIzLTQ3ZTYtOGY0Zi1jNjA1MjM4YzBjODQiLCJpYXQiOjE3NzQwODc0MzIsImV4cCI6NDkyOTg0NzQzMn0.cjYOTsQMT1hd8FRrHwVgpsXoViJnS6fDk-cValQ-e64"; // ⚠️ keep private

const walletInput = document.getElementById("walletAddress");
const chainSelect = document.getElementById("chainSelect");
const checkWalletBtn = document.getElementById("checkWallet");

const totalBalanceEl = document.getElementById("totalBalance");
const priceChangeEl = document.getElementById("priceChange");
const tokenListEl = document.getElementById("tokenList");
const txListEl = document.getElementById("txList");
const nftGalleryEl = document.getElementById("nftGallery");

const exportCSVBtn = document.getElementById("exportCSV");

let globalTokens = [];
let globalTxs = [];

/* ---------------- TABS ---------------- */
const tabButtons = document.querySelectorAll(".tabButton");
const tabContents = document.querySelectorAll(".tabContent");

tabButtons.forEach(btn => {
    btn.onclick = () => {
        tabButtons.forEach(b => b.classList.remove("active"));
        tabContents.forEach(t => t.classList.remove("active"));

        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    };
});

/* ---------------- PRICE FETCH ---------------- */
async function getPrice(chain) {
    const map = {
        eth: "ethereum",
        bsc: "binancecoin",
        polygon: "matic-network"
    };

    try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${map[chain]}&vs_currencies=usd&include_24hr_change=true`);
        const data = await res.json();

        return {
            price: data[map[chain]].usd,
            change: data[map[chain]].usd_24h_change
        };
    } catch {
        return { price: 0, change: 0 };
    }
}

/* ---------------- FETCH WALLET ---------------- */
checkWalletBtn.onclick = async () => {

    const wallet = walletInput.value.trim();
    const chain = chainSelect.value;

    if (!wallet) return alert("Enter wallet address");

    totalBalanceEl.textContent = "Loading...";
    tokenListEl.innerHTML = "Loading...";
    txListEl.innerHTML = "Loading...";
    nftGalleryEl.innerHTML = "Loading...";

    try {

        const [balRes, tokRes, txRes, nftRes, priceData] = await Promise.all([

            fetch(`https://deep-index.moralis.io/api/v2/${wallet}/balance?chain=${chain}`, {
                headers: { "X-API-Key": API_KEY }
            }).then(r => r.json()),

            fetch(`https://deep-index.moralis.io/api/v2/${wallet}/erc20?chain=${chain}`, {
                headers: { "X-API-Key": API_KEY }
            }).then(r => r.json()),

            fetch(`https://deep-index.moralis.io/api/v2/${wallet}?chain=${chain}`, {
                headers: { "X-API-Key": API_KEY }
            }).then(r => r.json()),

            fetch(`https://deep-index.moralis.io/api/v2/${wallet}/nft?chain=${chain}&media_items=true`, {
                headers: { "X-API-Key": API_KEY }
            }).then(r => r.json()),

            getPrice(chain)

        ]);

        /* -------- BALANCE -------- */
        const balance = balRes.balance / 1e18;
        const totalUSD = balance * priceData.price;

        totalBalanceEl.textContent = `$${totalUSD.toFixed(2)}`;

        if (priceChangeEl) {
            priceChangeEl.style.color = priceData.change >= 0 ? "lime" : "red";
            priceChangeEl.textContent = `${priceData.change.toFixed(2)}% (24h)`;
        }

        /* -------- TOKENS -------- */
        globalTokens = tokRes;

        tokenListEl.innerHTML = tokRes.length ? "" : "<li>No tokens</li>";

        tokRes.forEach(t => {
            const amount = t.balance / Math.pow(10, t.decimals);

            const li = document.createElement("li");
            li.innerHTML = `<strong>${t.symbol}</strong>: ${amount.toFixed(4)}`;
            tokenListEl.appendChild(li);
        });

        /* -------- TRANSACTIONS -------- */
        globalTxs = txRes.result || [];

        txListEl.innerHTML = globalTxs.length ? "" : "<li>No transactions</li>";

        globalTxs.slice(0, 15).forEach(tx => {
            const li = document.createElement("li");
            li.innerHTML = explainTransaction(tx, wallet, chain);
            txListEl.appendChild(li);
        });

        /* -------- NFTs -------- */
        nftGalleryEl.innerHTML = "";

        if (nftRes.result && nftRes.result.length > 0) {
            nftRes.result.forEach(nft => {

                const img = document.createElement("img");

                let url = nft.media?.preview_url;

                if (!url && nft.metadata) {
                    try {
                        const meta = JSON.parse(nft.metadata);
                        url = meta.image;
                    } catch {}
                }

                img.src = fixIPFS(url);
                img.onerror = () => img.src = "https://via.placeholder.com/100";

                nftGalleryEl.appendChild(img);
            });
        } else {
            nftGalleryEl.innerHTML = "<p>No NFTs</p>";
        }

    } catch (err) {
        console.error(err);
        totalBalanceEl.textContent = "Error loading data";
    }
};

/* ---------------- AI EXPLANATION ---------------- */
function explainTransaction(tx, user, chain) {

    const isOut = tx.from_address.toLowerCase() === user.toLowerCase();
    const value = (tx.value / 1e18).toFixed(4);

    if (tx.input && tx.input !== "0x") {
        return `🧠 Smart contract interaction on ${chain.toUpperCase()} (Swap / DeFi)`;
    }

    return isOut
        ? `🔴 You sent ${value} ${chain.toUpperCase()}`
        : `🟢 You received ${value} ${chain.toUpperCase()}`;
}

/* ---------------- IPFS FIX ---------------- */
function fixIPFS(url) {
    if (!url) return "https://via.placeholder.com/100";
    return url.startsWith("ipfs://")
        ? url.replace("ipfs://", "https://ipfs.io/ipfs/")
        : url;
}

/* ---------------- CSV EXPORT ---------------- */
exportCSVBtn.onclick = () => {

    let csv = "Type,Data\n";

    globalTokens.forEach(t => {
        csv += `Token,${t.symbol}\n`;
    });

    globalTxs.forEach(tx => {
        csv += `Tx,${tx.hash}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "chainview_data.csv";
    a.click();
};

});
