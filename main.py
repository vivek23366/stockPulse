#!/usr/bin/env python3
"""
Stock Pulse - A Terminal Dashboard for Stock Market Data

A CLI tool that fetches real-time stock data from Yahoo Finance and displays
it in a beautiful, color-coded terminal interface with ASCII charts.

Usage:
    python main.py                     # Interactive mode
    python main.py AAPL GOOGL MSFT     # Compare specific stocks
    python main.py --watch TSLA        # Watch a single stock
    python main.py --pulse             # Market pulse of popular stocks
"""

import argparse
import sys
import time
from typing import List

from src.fetcher import StockFetcher, validate_ticker
from src.analyzer import StockAnalyzer
from src.display import TerminalDisplay
from src.charts import ASCIIChart


# Default stocks for market pulse
DEFAULT_STOCKS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM']


def display_single_stock(ticker: str, fetcher: StockFetcher, analyzer: StockAnalyzer):
    """Display detailed information for a single stock."""
    print(TerminalDisplay.info(f"Fetching data for {ticker.upper()}..."))

    # Get stock info
    info = fetcher.get_stock_info(ticker)
    if not info:
        print(TerminalDisplay.error(f"Could not find stock: {ticker}"))
        return

    # Get price change
    change = fetcher.get_price_change(ticker)
    if change:
        info['change'] = change['change']
        info['change_percent'] = change['change_percent']

    # Get historical data for sparkline
    hist = fetcher.get_historical_data(ticker, period="1mo")

    # Display stock card
    print(TerminalDisplay.stock_card(info, hist))

    # Get and display volatility
    volatility = analyzer.calculate_volatility(ticker)
    if volatility:
        print(TerminalDisplay.volatility_report(volatility, ticker.upper()))

    # Get and display trend
    trend = analyzer.calculate_trend(ticker)
    if trend:
        print(f"\n  Trend:      {TerminalDisplay.color_trend(trend['trend'])}")
        print(f"  Period Δ:   {TerminalDisplay.color_percent(trend['price_change_percent'])}")
        print(f"  Support:    ${trend['support']:.2f}")
        print(f"  Resistance: ${trend['resistance']:.2f}")


def compare_stocks(tickers: List[str], analyzer: StockAnalyzer):
    """Compare multiple stocks side by side."""
    print(TerminalDisplay.info(f"Comparing {len(tickers)} stocks..."))
    print()

    comparisons = analyzer.compare_stocks(tickers)

    if not comparisons:
        print(TerminalDisplay.error("Could not fetch data for any of the specified stocks"))
        return

    print(TerminalDisplay.comparison_table(comparisons))

    # Show which stocks couldn't be fetched
    found = {c['symbol'] for c in comparisons}
    not_found = [t.upper() for t in tickers if t.upper() not in found]
    if not_found:
        print(f"\n{TerminalDisplay.error(f'Could not find: {', '.join(not_found)}')}")


def market_pulse(analyzer: StockAnalyzer, tickers: List[str] = None):
    """Display market pulse for a set of stocks."""
    if tickers is None:
        tickers = DEFAULT_STOCKS

    print(TerminalDisplay.info("Analyzing market pulse..."))
    print()

    pulse = analyzer.get_market_pulse(tickers)
    print(TerminalDisplay.market_pulse(pulse))

    print()
    comparisons = analyzer.compare_stocks(tickers)
    if comparisons:
        print(TerminalDisplay.comparison_table(comparisons))


def watch_stock(ticker: str, fetcher: StockFetcher, interval: int = 30):
    """Watch a stock with periodic updates."""
    print(TerminalDisplay.info(f"Watching {ticker.upper()} (updates every {interval}s, Ctrl+C to stop)"))

    try:
        while True:
            TerminalDisplay.clear_screen()
            print(TerminalDisplay.header(f"STOCK PULSE - {ticker.upper()}", 50))

            info = fetcher.get_stock_info(ticker)
            if info:
                change = fetcher.get_price_change(ticker)
                if change:
                    info['change'] = change['change']
                    info['change_percent'] = change['change_percent']

                hist = fetcher.get_historical_data(ticker, period="5d", interval="1h")
                print(TerminalDisplay.stock_card(info, hist))

                # Show last update time
                print(f"\n  {TerminalDisplay.info(f'Last update: {time.strftime('%H:%M:%S')}')}")
                print(f"  {TerminalDisplay.info(f'Next update in {interval}s (Ctrl+C to exit)')}")
            else:
                print(TerminalDisplay.error(f"Could not fetch data for {ticker}"))

            time.sleep(interval)

    except KeyboardInterrupt:
        print(f"\n{TerminalDisplay.info('Stopped watching.')}")


def interactive_mode(fetcher: StockFetcher, analyzer: StockAnalyzer):
    """Run in interactive mode with menu."""
    while True:
        TerminalDisplay.clear_screen()
        print(TerminalDisplay.header("STOCK PULSE", 50))
        print()
        print("  1. Look up a stock")
        print("  2. Compare stocks")
        print("  3. Market pulse")
        print("  4. Watch a stock")
        print("  5. Exit")
        print()

        try:
            choice = input(f"  Select option (1-5): ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if choice == '1':
            ticker = input("  Enter stock symbol: ").strip()
            if ticker:
                print()
                display_single_stock(ticker, fetcher, analyzer)
                input("\n  Press Enter to continue...")

        elif choice == '2':
            tickers = input("  Enter stock symbols (comma-separated): ").strip()
            if tickers:
                ticker_list = [t.strip() for t in tickers.split(',')]
                print()
                compare_stocks(ticker_list, analyzer)
                input("\n  Press Enter to continue...")

        elif choice == '3':
            print()
            market_pulse(analyzer)
            input("\n  Press Enter to continue...")

        elif choice == '4':
            ticker = input("  Enter stock symbol to watch: ").strip()
            if ticker:
                watch_stock(ticker, fetcher)

        elif choice == '5':
            print(TerminalDisplay.success("Goodbye!"))
            break

        else:
            print(TerminalDisplay.error("Invalid option"))
            time.sleep(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Stock Pulse - Terminal Dashboard for Stock Market Data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          Interactive mode
  %(prog)s AAPL GOOGL MSFT          Compare specific stocks
  %(prog)s --watch TSLA             Watch a single stock live
  %(prog)s --pulse                  Market pulse of popular stocks
  %(prog)s --info AAPL              Detailed info for a stock
        """
    )

    parser.add_argument(
        'tickers',
        nargs='*',
        help='Stock ticker symbols to analyze'
    )

    parser.add_argument(
        '--watch', '-w',
        metavar='TICKER',
        help='Watch a stock with live updates'
    )

    parser.add_argument(
        '--pulse', '-p',
        action='store_true',
        help='Show market pulse for popular stocks'
    )

    parser.add_argument(
        '--info', '-i',
        metavar='TICKER',
        help='Show detailed info for a single stock'
    )

    parser.add_argument(
        '--interval',
        type=int,
        default=30,
        help='Update interval in seconds for watch mode (default: 30)'
    )

    args = parser.parse_args()

    # Initialize components
    fetcher = StockFetcher()
    analyzer = StockAnalyzer()

    # Handle different modes
    if args.watch:
        watch_stock(args.watch, fetcher, args.interval)

    elif args.pulse:
        print(TerminalDisplay.header("STOCK PULSE", 50))
        market_pulse(analyzer)

    elif args.info:
        print(TerminalDisplay.header("STOCK PULSE", 50))
        display_single_stock(args.info, fetcher, analyzer)

    elif args.tickers:
        print(TerminalDisplay.header("STOCK PULSE", 50))
        if len(args.tickers) == 1:
            display_single_stock(args.tickers[0], fetcher, analyzer)
        else:
            compare_stocks(args.tickers, analyzer)

    else:
        # Interactive mode
        interactive_mode(fetcher, analyzer)


if __name__ == '__main__':
    main()
