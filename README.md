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

### Screenshots

```
┌────────────────────────────────────────────────┐
│              STOCK PULSE                        │
└────────────────────────────────────────────────┘

AAPL - Apple Inc.
──────────────────────────────────────────────────
  Price:  USD 195.27  +2.45 (+1.27%) ↗
  Range:  193.50 ████████████░░░░░░░░ 196.80
  Volume: 45.23M
  52W:    164.08 - 199.62
  Chart:  ▂▃▄▄▅▆▅▄▅▆▇▆▅▆▇█▇▆▇█

Volatility Analysis: AAPL
────────────────────────────────────────
  Risk Level: 🟢🟢🟢⚪⚪⚪⚪⚪⚪⚪
  Daily Vol:  1.45%
  Annual Vol: 23.02%
```

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

## Why I Built It This Way

### Architecture Decisions

1. **Modular Design**: Separated concerns into distinct modules:
   - `fetcher.py` - Data acquisition from Yahoo Finance
   - `analyzer.py` - Business logic for analysis
   - `charts.py` - Visualization components
   - `display.py` - Terminal formatting and colors

   This makes the code testable, maintainable, and extensible.

2. **ASCII Charts**: Chose sparklines and block characters for visualization because:
   - Works in any terminal without external dependencies
   - Instant visual feedback without leaving the CLI
   - Compact representation of trends

3. **Colorama for Cross-Platform Colors**: Works on Windows, macOS, and Linux without additional setup.

4. **yfinance Library**: Chose this over direct API calls because:
   - No API key required
   - Well-maintained and documented
   - Handles rate limiting gracefully

### Design Patterns

- **Single Responsibility**: Each class has one job
- **Dependency Injection**: Fetcher is passed to analyzer, making testing easier
- **Graceful Degradation**: Missing data doesn't crash the app; shows "N/A" instead

### Trade-offs

| Decision | Pros | Cons |
|----------|------|------|
| Terminal UI | Fast, works everywhere | Limited visualization |
| yfinance | Free, no auth | Rate limits, delayed data |
| Sync requests | Simple code | Slower for many stocks |

## What I'd Improve With More Time

1. **Async Data Fetching**: Use `aiohttp` to fetch multiple stocks concurrently, significantly improving performance for comparisons.

2. **Data Caching**: Implement Redis or SQLite caching to reduce API calls and improve responsiveness.

3. **More Chart Types**: Add candlestick charts, volume bars, and technical indicators (RSI, MACD).

4. **Configuration File**: Allow users to save favorite stocks, default view settings, and custom themes.

5. **Alerts System**: Add price alerts that can send desktop notifications or emails.

6. **Historical Comparisons**: Compare stock performance across different time periods.

7. **Portfolio Tracking**: Allow users to input their holdings and see total portfolio value/performance.

8. **Export Features**: Export data to CSV or generate PDF reports.

## Project Structure

```
stock-pulse/
├── main.py              # Entry point and CLI handling
├── requirements.txt     # Python dependencies
├── README.md           # This file
├── src/
│   ├── __init__.py
│   ├── fetcher.py      # Yahoo Finance data fetching
│   ├── analyzer.py     # Stock analysis and metrics
│   ├── charts.py       # ASCII chart generation
│   └── display.py      # Terminal formatting
└── tests/
    ├── __init__.py
    ├── test_fetcher.py # Fetcher unit tests
    └── test_charts.py  # Chart generation tests
```

## Technologies Used

- **Python 3.8+** - Core language
- **yfinance** - Yahoo Finance API wrapper
- **pandas** - Data manipulation
- **colorama** - Cross-platform terminal colors
- **pytest** - Testing framework

## API Reference

### StockFetcher

```python
fetcher = StockFetcher()

# Get stock info
info = fetcher.get_stock_info('AAPL')

# Get historical data
hist = fetcher.get_historical_data('AAPL', period='1mo')

# Get price change
change = fetcher.get_price_change('AAPL')
```

### StockAnalyzer

```python
analyzer = StockAnalyzer()

# Calculate volatility
volatility = analyzer.calculate_volatility('AAPL')

# Analyze trend
trend = analyzer.calculate_trend('AAPL')

# Compare stocks
comparison = analyzer.compare_stocks(['AAPL', 'GOOGL', 'MSFT'])
```

## Edge Cases Handled

- Invalid ticker symbols → Returns None with error message
- Network failures → Graceful error handling
- Missing data fields → Falls back to defaults
- Empty historical data → Shows "No data" message
- Rate limiting → Uses conservative request patterns

## License

MIT License - feel free to use this code for any purpose.

## Author

Built by Sushant Dagar for the CirqlLabs coding challenge.

---

*"The stock market is filled with individuals who know the price of everything, but the value of nothing." - Philip Fisher*
