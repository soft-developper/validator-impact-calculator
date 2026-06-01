# Optimum Validator Impact Calculator

> **Community contribution** — not an official Optimum product.

An open-source, zero-dependency calculator that estimates the **APR uplift** and **bandwidth savings** validators can expect by switching from gossipsub to [mump2p](https://docs.getoptimum.xyz/docs/learn/overview/intro), based on Optimum's published research.

🔗 **Live demo**: [your-app.vercel.app](https://your-app.vercel.app)

---

## Features

- 📈 **APR uplift estimate** — modelled on +0.66–0.97% per 50ms of additional slot time
- 💰 **Extra annual revenue** — in both ETH and USD
- 📡 **MEV bid uplift** — 13–18% depending on latency window
- 🌐 **Bandwidth savings** — ~90–95% reduction vs gossipsub
- 🔴 **Live ETH price** — auto-fetched from CoinGecko (no API key needed)
- 🔗 **Shareable URL** — all inputs encoded in query params
- 📱 **Responsive** — works on mobile and desktop
- ⚡ **Zero dependencies** — plain HTML + CSS + JS, no build step

---

## Research basis

All estimates derived from Optimum's published research:

- [Optimizing a $100B Market: Effects of Latency Reduction on ETH Staking Revenue](https://www.getoptimum.xyz/blog/optimizing-a-100b-market-effects-of-latency-reduction-on-eth-staking-revenue) (Mar 2026)
- +0.66–0.97% APR per 50ms slot time gain
- 13–18% average MEV bid uplift (50–250ms range)
- ~90–95% bandwidth reduction vs gossipsub baseline
- Head vote accuracy: 98.6% → up to 99.1%

---

## Deploy to Vercel

### Option 1 — Vercel CLI (fastest)

```bash
npm i -g vercel
vercel
```

### Option 2 — Vercel dashboard

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repo → click **Deploy**

No build config needed — Vercel detects static HTML automatically.

---

## Run locally

No build step required. Just open the file:

```bash
# macOS
open index.html

# Or serve with any static server
npx serve .
# → http://localhost:3000
```

---

## Project structure

```
optimum-calculator/
├── index.html       # Markup & layout
├── style.css        # All styles (CSS variables, responsive)
├── calculator.js    # All logic (calculations, live price, URL sharing)
├── vercel.json      # Vercel deployment config
└── README.md
```

---

## Contributing

PRs welcome. Ideas:
- Add Solana / Monad chain support
- Embed as an iframe widget for third-party sites
- Add a comparison table for different consensus clients
- Dark mode

---

## Disclaimer

Estimates are projections based on published research. Actual results may vary depending on network conditions, validator setup, and ETH price. Not financial advice.

---

*Built with ♥ for the Optimum community.*
