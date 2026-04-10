"""
Stock analysis module for volatility, trends, and insights.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from .fetcher import StockFetcher


class StockAnalyzer:
    """Analyzes stock data for insights and metrics."""

    def __init__(self):
        self.fetcher = StockFetcher()

    def calculate_volatility(self, ticker: str, period: str = "1mo") -> Optional[Dict[str, float]]:
        """
        Calculate stock volatility metrics.

        Args:
            ticker: Stock symbol
            period: Historical data period

        Returns:
            Dictionary with volatility metrics
        """
        hist = self.fetcher.get_historical_data(ticker, period=period)

        if hist is None or len(hist) < 2:
            return None

        # Calculate daily returns
        returns = hist['Close'].pct_change().dropna()

        if len(returns) == 0:
            return None

        # Standard deviation of returns (daily volatility)
        daily_volatility = returns.std()

        # Annualized volatility (assuming 252 trading days)
        annual_volatility = daily_volatility * np.sqrt(252)

        # Average True Range (ATR) - simplified
        high_low = hist['High'] - hist['Low']
        atr = high_low.mean()

        # Price range percentage
        price_range = ((hist['High'].max() - hist['Low'].min()) / hist['Close'].mean()) * 100

        return {
            'daily_volatility': daily_volatility * 100,  # As percentage
            'annual_volatility': annual_volatility * 100,
            'atr': atr,
            'price_range_percent': price_range,
            'max_daily_gain': returns.max() * 100,
            'max_daily_loss': returns.min() * 100,
        }

    def calculate_trend(self, ticker: str, period: str = "1mo") -> Optional[Dict[str, Any]]:
        """
        Analyze stock trend direction and strength.

        Args:
            ticker: Stock symbol
            period: Historical data period

        Returns:
            Dictionary with trend analysis
        """
        hist = self.fetcher.get_historical_data(ticker, period=period)

        if hist is None or len(hist) < 5:
            return None

        closes = hist['Close']

        # Simple moving averages
        sma_5 = closes.tail(5).mean()
        sma_20 = closes.tail(20).mean() if len(closes) >= 20 else closes.mean()

        # Price position
        current_price = closes.iloc[-1]
        period_start = closes.iloc[0]

        # Calculate trend
        price_change = ((current_price - period_start) / period_start) * 100

        # Trend direction
        if sma_5 > sma_20 and price_change > 0:
            trend = 'bullish'
            strength = min(abs(price_change) / 10, 1.0)  # Normalize to 0-1
        elif sma_5 < sma_20 and price_change < 0:
            trend = 'bearish'
            strength = min(abs(price_change) / 10, 1.0)
        else:
            trend = 'neutral'
            strength = 0.5

        # Support and resistance (simplified)
        support = closes.tail(20).min() if len(closes) >= 20 else closes.min()
        resistance = closes.tail(20).max() if len(closes) >= 20 else closes.max()

        return {
            'trend': trend,
            'strength': strength,
            'price_change_percent': price_change,
            'sma_5': sma_5,
            'sma_20': sma_20,
            'support': support,
            'resistance': resistance,
            'current_price': current_price,
        }

    def compare_stocks(self, tickers: List[str], period: str = "1mo") -> List[Dict[str, Any]]:
        """
        Compare multiple stocks on various metrics.

        Args:
            tickers: List of stock symbols
            period: Historical data period

        Returns:
            List of comparison dictionaries sorted by performance
        """
        comparisons = []

        for ticker in tickers:
            info = self.fetcher.get_stock_info(ticker)
            if not info:
                continue

            volatility = self.calculate_volatility(ticker, period)
            trend      = self.calculate_trend(ticker, period)
            change     = self.fetcher.get_price_change(ticker)

            # ── Risk level from annual volatility ──────────────────────
            ann_vol = volatility['annual_volatility'] if volatility else 0
            if ann_vol < 15:
                risk_level = 'Low'
            elif ann_vol < 30:
                risk_level = 'Medium'
            elif ann_vol < 50:
                risk_level = 'High'
            else:
                risk_level = 'Extreme'

            # ── Day range string ───────────────────────────────────────
            day_low  = info.get('day_low', 0)
            day_high = info.get('day_high', 0)
            day_range = f"${day_low:.2f} – ${day_high:.2f}" if day_low and day_high else '—'

            # ── 52-week range string ───────────────────────────────────
            w52_low  = info.get('fifty_two_week_low', 0)
            w52_high = info.get('fifty_two_week_high', 0)
            week52_range = f"${w52_low:.2f} – ${w52_high:.2f}" if w52_low and w52_high else '—'

            comparison = {
                'symbol':        ticker.upper(),
                'name':          info['name'],
                'price':         info['price'],
                'currency':      info['currency'],
                'volume':        info.get('volume', 0),
                'market_cap':    info.get('market_cap', 0),
                'day_high':      day_high,
                'day_low':       day_low,
                'day_range':     day_range,
                'week52_range':  week52_range,
                'risk_level':    risk_level,
                'annual_volatility': ann_vol,
                'max_gain':      volatility['max_daily_gain'] if volatility else 0,
                'max_loss':      volatility['max_daily_loss'] if volatility else 0,
            }

            if change:
                comparison['change']         = change['change']
                comparison['change_percent'] = change['change_percent']
            else:
                comparison['change']         = 0
                comparison['change_percent'] = 0

            if volatility:
                comparison['volatility'] = volatility['daily_volatility']
            else:
                comparison['volatility'] = 0

            if trend:
                comparison['trend']         = trend['trend']
                comparison['period_change'] = trend['price_change_percent']
            else:
                comparison['trend']         = 'unknown'
                comparison['period_change'] = 0

            comparisons.append(comparison)

        # Sort by daily change percentage (best performers first)
        comparisons.sort(key=lambda x: x['change_percent'], reverse=True)

        return comparisons

    def get_market_pulse(self, tickers: List[str]) -> Dict[str, Any]:
        """
        Get overall market sentiment from a list of stocks.

        Args:
            tickers: List of stock symbols to analyze

        Returns:
            Dictionary with market pulse metrics
        """
        gainers = 0
        losers = 0
        unchanged = 0
        total_change = 0

        for ticker in tickers:
            change = self.fetcher.get_price_change(ticker)
            if change:
                total_change += change['change_percent']
                if change['change_percent'] > 0.1:
                    gainers += 1
                elif change['change_percent'] < -0.1:
                    losers += 1
                else:
                    unchanged += 1

        total = gainers + losers + unchanged
        if total == 0:
            return {
                'sentiment': 'unknown',
                'gainers': 0,
                'losers': 0,
                'unchanged': 0,
                'average_change': 0,
            }

        average_change = total_change / total

        if gainers > losers * 1.5:
            sentiment = 'bullish'
        elif losers > gainers * 1.5:
            sentiment = 'bearish'
        else:
            sentiment = 'mixed'

        return {
            'sentiment': sentiment,
            'gainers': gainers,
            'losers': losers,
            'unchanged': unchanged,
            'average_change': average_change,
        }
