"""
Stock data fetcher module using yfinance.
Handles all API interactions with Yahoo Finance.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List


class StockFetcher:
    """Fetches and caches stock data from Yahoo Finance."""

    def __init__(self):
        self._cache: Dict[str, Any] = {}

    def get_stock_info(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Fetch basic stock information.

        Args:
            ticker: Stock symbol (e.g., 'AAPL', 'GOOGL')

        Returns:
            Dictionary with stock info or None if invalid ticker
        """
        try:
            stock = yf.Ticker(ticker.upper())
            info = stock.info

            # Check if valid ticker (yfinance returns empty dict for invalid)
            if not info or 'regularMarketPrice' not in info:
                return None

            return {
                'symbol': ticker.upper(),
                'name': info.get('shortName', info.get('longName', ticker)),
                'price': info.get('regularMarketPrice', 0),
                'previous_close': info.get('previousClose', 0),
                'open': info.get('regularMarketOpen', 0),
                'day_high': info.get('dayHigh', 0),
                'day_low': info.get('dayLow', 0),
                'volume': info.get('volume', 0),
                'market_cap': info.get('marketCap', 0),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh', 0),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow', 0),
                'currency': info.get('currency', 'USD'),
            }
        except Exception as e:
            return None

    def get_historical_data(
        self,
        ticker: str,
        period: str = "1mo",
        interval: str = "1d"
    ) -> Optional[pd.DataFrame]:
        """
        Fetch historical price data.

        Args:
            ticker: Stock symbol
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

        Returns:
            DataFrame with OHLCV data or None
        """
        try:
            stock = yf.Ticker(ticker.upper())
            hist = stock.history(period=period, interval=interval)

            if hist.empty:
                return None

            return hist
        except Exception as e:
            return None

    def get_multiple_stocks(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetch data for multiple stocks at once.

        Args:
            tickers: List of stock symbols

        Returns:
            Dictionary mapping ticker to stock info
        """
        results = {}
        for ticker in tickers:
            info = self.get_stock_info(ticker)
            if info:
                results[ticker.upper()] = info
        return results

    def get_price_change(self, ticker: str) -> Optional[Dict[str, float]]:
        """
        Calculate price change metrics.

        Args:
            ticker: Stock symbol

        Returns:
            Dictionary with change amount and percentage
        """
        info = self.get_stock_info(ticker)
        if not info:
            return None

        price = info['price']
        prev_close = info['previous_close']

        if prev_close == 0:
            return None

        change = price - prev_close
        change_percent = (change / prev_close) * 100

        return {
            'change': change,
            'change_percent': change_percent,
            'direction': 'up' if change > 0 else 'down' if change < 0 else 'flat'
        }


def validate_ticker(ticker: str) -> bool:
    """
    Check if a ticker symbol is valid.

    Args:
        ticker: Stock symbol to validate

    Returns:
        True if valid, False otherwise
    """
    fetcher = StockFetcher()
    return fetcher.get_stock_info(ticker) is not None
