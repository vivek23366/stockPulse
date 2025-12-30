# Stock Pulse 📈

A beautiful terminal dashboard for real-time stock market data, built with Python and Yahoo Finance.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## What It Does

Stock Pulse is a CLI tool that transforms raw stock market data into a visually appealing, color-coded terminal interface. It provides:

- **Real-time stock quotes** with price changes and trend indicators
- **ASCII sparkline charts** showing price history at a glance
- **Stock comparison tables** to analyze multiple stocks side-by-side
- **Volatility analysis** with visual risk meters
- **Market pulse** showing overall market sentiment
- **Watch mode** for live price monitoring

### Demo Output

```
┌────────────────────────────────────────────────┐
│                  STOCK PULSE                   │
└────────────────────────────────────────────────┘

AAPL - Apple Inc.
──────────────────────────────────────────────────
  Price:  USD 273.76  +0.36 (+0.13%) ↗
  Range:  272.35 ██████████████░░░░░░ 274.36
  Volume: 23.40M
  52W:    169.21 - 288.62
  Chart:  ▆█▆▅▄▃▃▄▃▃▁▁  ▁  ▁▁▁

Volatility Analysis: AAPL
────────────────────────────────────────
  Risk Level: ⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪
  Daily Vol:  0.70%
  Annual Vol: 11.11%
  Max Gain:   +1.09%
  Max Loss:   -1.50%

  Trend:      BEARISH
  Period Δ:   -3.30%
  Support:    $270.97
  Resistance: $286.19
```

```
┌──────────────────────────────────────┐
│             MARKET PULSE             │
└──────────────────────────────────────┘
  Sentiment:  BEARISH
  G/L Ratio:  ████████████████████
  Gainers:    1
  Losers:     6
  Avg Change: -0.83%

Symbol          Price     Change        % Trend      Volatility
──────────────────────────────────────────────────────────────────────
AAPL        USD273.76     +0.36  +0.13% BEARISH       0.70%
GOOGL       USD313.56     +0.05  +0.02% NEUTRAL       1.44%
MSFT        USD487.10     -0.61  -0.13% BULLISH       1.14%
TSLA        USD459.64    -15.55  -3.27% BULLISH       2.52%
```

---

## How to Run

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

```bash
# Clone the repository
git clone https://github.com/Sushant-Dagar/stock-pulse.git
cd stock-pulse

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Usage

```bash
# Interactive mode (menu-driven)
python main.py

# Look up a single stock
python main.py AAPL

# Compare multiple stocks
python main.py AAPL GOOGL MSFT AMZN

# Get detailed info for a stock
python main.py --info TSLA

# Watch a stock live (updates every 30 seconds)
python main.py --watch NVDA

# Watch with custom interval (10 seconds)
python main.py --watch NVDA --interval 10

# Market pulse of popular stocks
python main.py --pulse
```

### Running Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_charts.py
```

---

## My Thought Process

### Step 1: Understanding the Problem

When I first read the challenge, I identified the core requirements:
1. Use real stock market data from yfinance
2. Build something "interesting" — not just fetch and print
3. Make it runnable with clear instructions
4. Document my thinking

The key phrase that stood out was **"pick something that excites YOU"**. I wanted to build something I'd actually use — a tool that makes market data accessible without opening a browser or app.

### Step 2: Choosing What to Build

I brainstormed several options from the suggestions:
- CLI tool comparing stocks ✓
- Price alert script
- Dashboard showing trends ✓
- Volatility analysis ✓

Instead of picking just one, I realized I could combine several into a **unified terminal dashboard**. This approach:
- Shows breadth (multiple features)
- Shows depth (each feature is complete)
- Demonstrates integration skills (features work together)

### Step 3: Designing the Architecture

I sketched out the modules before writing code:

```
┌─────────────────────────────────────────────────────────────┐
│                        main.py                               │
│                    (CLI & User Interface)                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  fetcher.py   │    │  analyzer.py  │    │  display.py   │
│ (Data Layer)  │    │(Business Logic)│   │ (Presentation)│
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌───────────────┐
                    │   charts.py   │
                    │ (Visualization)│
                    └───────────────┘
```

**Why this separation?**
- **Testability**: Each module can be tested independently
- **Maintainability**: Changes in one area don't break others
- **Extensibility**: Easy to add new features (e.g., new chart types)

### Step 4: Key Design Decisions

#### Decision 1: ASCII Charts Over External Libraries

**Options considered:**
- matplotlib (save as image, display separately)
- plotext (terminal plotting library)
- Custom ASCII charts

**Chose: Custom ASCII charts**

**Reasoning:**
- Zero additional dependencies for visualization
- Works in ANY terminal (SSH, minimal environments)
- Faster to render (no image generation)
- More educational — I learned how sparklines work!

```python
# Sparkline characters map values to visual height
SPARK_CHARS = ' ▁▂▃▄▅▆▇█'
```

#### Decision 2: Colorama for Cross-Platform Colors

**Options considered:**
- Rich (full TUI framework)
- blessed/curses (low-level terminal control)
- colorama (simple ANSI colors)

**Chose: Colorama**

**Reasoning:**
- Rich is overkill for this scope
- curses doesn't work well on Windows
- Colorama is simple, cross-platform, and sufficient

#### Decision 3: Synchronous Over Async Requests

**Options considered:**
- aiohttp + asyncio (concurrent requests)
- requests/yfinance (synchronous)

**Chose: Synchronous**

**Reasoning:**
- Simpler code, easier to understand
- yfinance handles rate limiting internally
- For 8-10 stocks, the performance difference is negligible (~2-3 seconds)
- Async would be premature optimization for this scope

#### Decision 4: No Caching

**Options considered:**
- Redis caching
- SQLite local cache
- In-memory cache with TTL
- No caching

**Chose: No caching (initially)**

**Reasoning:**
- Fresh data is expected for stock prices
- Adds complexity without clear benefit for this use case
- Rate limits aren't an issue for casual use
- Listed as future improvement

### Step 5: Implementation Order

I followed a specific order to ensure I always had working code:

1. **Fetcher first** — Can't build anything without data
2. **Charts second** — Visual feedback motivates further development
3. **Display third** — Makes output beautiful
4. **Analyzer fourth** — Adds intelligence to raw data
5. **Main CLI last** — Ties everything together

This order meant I could test each component as I built it.

### Step 6: Testing Strategy

I focused tests on:

1. **Chart generation** (16 tests) — Core visualization logic
   - Edge cases: empty data, single value, constant values
   - Boundary conditions: full bar, empty bar

2. **Data fetching** (8 tests) — API interaction
   - Valid/invalid tickers
   - Data structure validation

**Why not test everything?**
- Display formatting is visual — hard to assert "looks good"
- Analyzer uses fetcher — integration tests would be slow
- Time constraint: focused on highest-value tests

### Step 7: What I Learned

1. **yfinance quirks**: Invalid tickers return empty dicts, not errors
2. **Unicode in terminals**: Not all terminals support all block characters
3. **Color codes**: ANSI escape sequences are surprisingly simple
4. **Pandas power**: Rolling calculations and resampling are elegant

---

## Why I Built It This Way

### Architecture Principles

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility** | Each module has one job |
| **Dependency Injection** | Fetcher passed to Analyzer |
| **Graceful Degradation** | Missing data shows "N/A", not crashes |
| **Progressive Enhancement** | Basic info always works, advanced features optional |

### Trade-offs Made

| Decision | Benefit | Cost |
|----------|---------|------|
| Terminal UI | Fast, universal | Limited visualization |
| yfinance | Free, no auth | Rate limits, delayed data |
| Sync requests | Simple code | Slower for many stocks |
| No caching | Always fresh | More API calls |
| Custom charts | Zero deps | Less sophisticated |

---

## What I'd Improve With More Time

### High Priority

1. **Async Data Fetching**
   ```python
   async def fetch_all(tickers):
       async with aiohttp.ClientSession() as session:
           tasks = [fetch_stock(session, t) for t in tickers]
           return await asyncio.gather(*tasks)
   ```
   Would reduce 8-stock comparison from ~8s to ~1s.

2. **Configuration File**
   ```yaml
   # ~/.stockpulse.yml
   favorites:
     - AAPL
     - GOOGL
   theme: dark
   refresh_interval: 30
   ```

3. **SQLite Caching**
   Cache historical data (doesn't change) while fetching fresh prices.

### Medium Priority

4. **Technical Indicators**: RSI, MACD, Bollinger Bands
5. **Portfolio Tracking**: Input holdings, track total value
6. **Price Alerts**: Desktop notifications when price hits target

### Nice to Have

7. **Export to CSV/JSON**
8. **Candlestick ASCII charts**
9. **News integration** (sentiment from headlines)
10. **Multi-currency support**

---

## Project Structure

```
stock-pulse/
├── main.py              # Entry point, CLI argument handling
├── requirements.txt     # Python dependencies
├── README.md            # This file
├── setup.py             # Package configuration
├── .gitignore           # Git ignore rules
│
├── src/
│   ├── __init__.py
│   ├── fetcher.py       # Yahoo Finance API wrapper
│   │                    # - get_stock_info()
│   │                    # - get_historical_data()
│   │                    # - get_price_change()
│   │
│   ├── analyzer.py      # Business logic layer
│   │                    # - calculate_volatility()
│   │                    # - calculate_trend()
│   │                    # - compare_stocks()
│   │                    # - get_market_pulse()
│   │
│   ├── charts.py        # ASCII visualization
│   │                    # - sparkline()
│   │                    # - horizontal_bar()
│   │                    # - volatility_meter()
│   │                    # - mini_chart()
│   │
│   └── display.py       # Terminal formatting
│                        # - color_change()
│                        # - stock_card()
│                        # - comparison_table()
│                        # - market_pulse()
│
└── tests/
    ├── __init__.py
    ├── test_fetcher.py  # 8 tests for data fetching
    └── test_charts.py   # 16 tests for chart generation
```

---

## Technologies Used

| Technology | Purpose | Why Chosen |
|------------|---------|------------|
| **Python 3.8+** | Core language | Required by challenge |
| **yfinance** | Market data | Free, no API key, well-documented |
| **pandas** | Data manipulation | Industry standard, powerful |
| **colorama** | Terminal colors | Cross-platform, simple |
| **pytest** | Testing | Clean syntax, good fixtures |

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Invalid ticker | Returns None, displays error message |
| Network failure | Graceful error, suggests retry |
| Missing data fields | Falls back to 0 or "N/A" |
| Empty historical data | Shows "No data" instead of crash |
| All same values (sparkline) | Displays flat middle line |
| Extreme volatility | Caps meter at 100% |

---

## Running the Tests

```bash
$ pytest -v

tests/test_charts.py::TestASCIIChart::test_sparkline_basic PASSED
tests/test_charts.py::TestASCIIChart::test_sparkline_empty PASSED
tests/test_charts.py::TestASCIIChart::test_horizontal_bar PASSED
tests/test_charts.py::TestASCIIChart::test_trend_arrow_up PASSED
... (24 tests total)

============================= 24 passed in 15.09s ==============================
```

---

## License

MIT License - feel free to use this code for any purpose.

---

## Author

Built by **Sushant Dagar** for the CirqlLabs coding challenge.

**Contact:** [GitHub](https://github.com/Sushant-Dagar)

---

*"The stock market is a device for transferring money from the impatient to the patient." - Warren Buffett*
