"""
Terminal display module with colored output.
Handles all formatting and presentation of stock data.
"""

import os
import sys
from typing import Dict, Any, List, Optional
from colorama import init, Fore, Back, Style
from .charts import ASCIIChart

# Initialize colorama for Windows support
init(autoreset=True)


class TerminalDisplay:
    """Handles all terminal output formatting."""

    # Box drawing characters
    BOX_H = '─'
    BOX_V = '│'
    BOX_TL = '┌'
    BOX_TR = '┐'
    BOX_BL = '└'
    BOX_BR = '┘'
    BOX_T = '┬'
    BOX_B = '┴'
    BOX_L = '├'
    BOX_R = '┤'
    BOX_X = '┼'

    @staticmethod
    def clear_screen():
        """Clear the terminal screen."""
        os.system('cls' if os.name == 'nt' else 'clear')

    @staticmethod
    def color_change(value: float, include_sign: bool = True) -> str:
        """
        Color a value based on positive/negative.

        Args:
            value: Numeric value to color
            include_sign: Whether to include +/- sign

        Returns:
            Colored string representation
        """
        if value > 0:
            sign = '+' if include_sign else ''
            return f"{Fore.GREEN}{sign}{value:.2f}{Style.RESET_ALL}"
        elif value < 0:
            return f"{Fore.RED}{value:.2f}{Style.RESET_ALL}"
        else:
            return f"{Fore.YELLOW}{value:.2f}{Style.RESET_ALL}"

    @staticmethod
    def color_percent(value: float) -> str:
        """
        Color a percentage value.

        Args:
            value: Percentage value

        Returns:
            Colored string with % sign
        """
        if value > 0:
            return f"{Fore.GREEN}+{value:.2f}%{Style.RESET_ALL}"
        elif value < 0:
            return f"{Fore.RED}{value:.2f}%{Style.RESET_ALL}"
        else:
            return f"{Fore.YELLOW}{value:.2f}%{Style.RESET_ALL}"

    @staticmethod
    def color_trend(trend: str) -> str:
        """
        Color a trend indicator.

        Args:
            trend: Trend string (bullish/bearish/neutral)

        Returns:
            Colored trend string
        """
        colors = {
            'bullish': Fore.GREEN,
            'bearish': Fore.RED,
            'neutral': Fore.YELLOW,
            'mixed': Fore.YELLOW,
            'unknown': Fore.WHITE,
        }
        color = colors.get(trend.lower(), Fore.WHITE)
        return f"{color}{trend.upper()}{Style.RESET_ALL}"

    @classmethod
    def header(cls, title: str, width: int = 60) -> str:
        """
        Create a styled header box.

        Args:
            title: Header title
            width: Box width

        Returns:
            Formatted header string
        """
        padding = (width - len(title) - 2) // 2
        lines = [
            f"{Fore.CYAN}{cls.BOX_TL}{cls.BOX_H * (width - 2)}{cls.BOX_TR}{Style.RESET_ALL}",
            f"{Fore.CYAN}{cls.BOX_V}{Style.RESET_ALL}{' ' * padding}{Fore.WHITE}{Style.BRIGHT}{title}{Style.RESET_ALL}{' ' * (width - padding - len(title) - 2)}{Fore.CYAN}{cls.BOX_V}{Style.RESET_ALL}",
            f"{Fore.CYAN}{cls.BOX_BL}{cls.BOX_H * (width - 2)}{cls.BOX_BR}{Style.RESET_ALL}",
        ]
        return '\n'.join(lines)

    @classmethod
    def divider(cls, width: int = 60) -> str:
        """Create a horizontal divider."""
        return f"{Fore.CYAN}{cls.BOX_H * width}{Style.RESET_ALL}"

    @classmethod
    def stock_card(cls, stock_data: Dict[str, Any], hist_data=None) -> str:
        """
        Create a formatted stock information card.

        Args:
            stock_data: Dictionary with stock information
            hist_data: Optional historical data for sparkline

        Returns:
            Formatted stock card string
        """
        lines = []

        # Header with symbol and name
        symbol = stock_data.get('symbol', 'N/A')
        name = stock_data.get('name', 'Unknown')[:30]
        lines.append(f"\n{Fore.WHITE}{Style.BRIGHT}{symbol}{Style.RESET_ALL} - {Fore.CYAN}{name}{Style.RESET_ALL}")
        lines.append(cls.divider(50))

        # Price and change
        price = stock_data.get('price', 0)
        currency = stock_data.get('currency', 'USD')
        change = stock_data.get('change', 0)
        change_percent = stock_data.get('change_percent', 0)

        price_str = f"{Fore.WHITE}{Style.BRIGHT}{currency} {price:.2f}{Style.RESET_ALL}"
        change_str = f"{cls.color_change(change)} ({cls.color_percent(change_percent)})"
        arrow = ASCIIChart.trend_arrow(change_percent)

        lines.append(f"  Price:  {price_str}  {change_str} {arrow}")

        # Day range
        day_low = stock_data.get('day_low', 0)
        day_high = stock_data.get('day_high', 0)
        if day_low and day_high:
            range_bar = ASCIIChart.horizontal_bar(price, day_low, day_high, 20)
            lines.append(f"  Range:  {day_low:.2f} {Fore.BLUE}{range_bar}{Style.RESET_ALL} {day_high:.2f}")

        # Volume
        volume = stock_data.get('volume', 0)
        if volume:
            volume_str = cls._format_number(volume)
            lines.append(f"  Volume: {volume_str}")

        # 52-week range
        week_low = stock_data.get('fifty_two_week_low', 0)
        week_high = stock_data.get('fifty_two_week_high', 0)
        if week_low and week_high:
            lines.append(f"  52W:    {Fore.RED}{week_low:.2f}{Style.RESET_ALL} - {Fore.GREEN}{week_high:.2f}{Style.RESET_ALL}")

        # Sparkline if historical data available
        if hist_data is not None and not hist_data.empty:
            sparkline = ASCIIChart.price_sparkline(hist_data, width=30)
            lines.append(f"  Chart:  {Fore.YELLOW}{sparkline}{Style.RESET_ALL}")

        return '\n'.join(lines)

    @classmethod
    def comparison_table(cls, stocks: List[Dict[str, Any]]) -> str:
        """
        Create a comparison table for multiple stocks.

        Args:
            stocks: List of stock comparison dictionaries

        Returns:
            Formatted table string
        """
        if not stocks:
            return "No data to display"

        lines = []
        lines.append(f"\n{Fore.WHITE}{Style.BRIGHT}{'Symbol':<8} {'Price':>12} {'Change':>10} {'%':>8} {'Trend':<10} {'Volatility':>10}{Style.RESET_ALL}")
        lines.append(cls.divider(70))

        for stock in stocks:
            symbol = stock['symbol'][:7]
            price = f"{stock.get('currency', '$')}{stock['price']:.2f}"
            change = stock.get('change', 0)
            change_pct = stock.get('change_percent', 0)
            trend = stock.get('trend', 'N/A')
            volatility = stock.get('volatility', 0)

            # Color coding
            change_str = cls.color_change(change)
            pct_str = cls.color_percent(change_pct)
            trend_str = cls.color_trend(trend)

            lines.append(
                f"{Fore.CYAN}{symbol:<8}{Style.RESET_ALL} "
                f"{price:>12} "
                f"{change_str:>18} "
                f"{pct_str:>16} "
                f"{trend_str:<18} "
                f"{volatility:>8.2f}%"
            )

        return '\n'.join(lines)

    @classmethod
    def market_pulse(cls, pulse: Dict[str, Any]) -> str:
        """
        Display market pulse summary.

        Args:
            pulse: Market pulse dictionary

        Returns:
            Formatted pulse display
        """
        lines = []
        lines.append(cls.header("MARKET PULSE", 40))

        sentiment = pulse.get('sentiment', 'unknown')
        gainers = pulse.get('gainers', 0)
        losers = pulse.get('losers', 0)
        avg_change = pulse.get('average_change', 0)

        # Sentiment indicator
        sentiment_str = cls.color_trend(sentiment)
        lines.append(f"  Sentiment:  {sentiment_str}")

        # Gainers vs Losers bar
        total = gainers + losers
        if total > 0:
            gainer_pct = gainers / total
            bar_width = 20
            green_bars = int(gainer_pct * bar_width)
            red_bars = bar_width - green_bars
            bar = f"{Fore.GREEN}{'█' * green_bars}{Fore.RED}{'█' * red_bars}{Style.RESET_ALL}"
            lines.append(f"  G/L Ratio:  {bar}")

        lines.append(f"  Gainers:    {Fore.GREEN}{gainers}{Style.RESET_ALL}")
        lines.append(f"  Losers:     {Fore.RED}{losers}{Style.RESET_ALL}")
        lines.append(f"  Avg Change: {cls.color_percent(avg_change)}")

        return '\n'.join(lines)

    @classmethod
    def volatility_report(cls, volatility: Dict[str, float], symbol: str) -> str:
        """
        Display volatility analysis report.

        Args:
            volatility: Volatility metrics dictionary
            symbol: Stock symbol

        Returns:
            Formatted volatility report
        """
        lines = []
        lines.append(f"\n{Fore.WHITE}{Style.BRIGHT}Volatility Analysis: {symbol}{Style.RESET_ALL}")
        lines.append(cls.divider(40))

        daily_vol = volatility.get('daily_volatility', 0)
        annual_vol = volatility.get('annual_volatility', 0)
        max_gain = volatility.get('max_daily_gain', 0)
        max_loss = volatility.get('max_daily_loss', 0)

        # Volatility meter
        meter = ASCIIChart.volatility_meter(daily_vol)
        lines.append(f"  Risk Level: {meter}")
        lines.append(f"  Daily Vol:  {daily_vol:.2f}%")
        lines.append(f"  Annual Vol: {annual_vol:.2f}%")
        lines.append(f"  Max Gain:   {Fore.GREEN}+{max_gain:.2f}%{Style.RESET_ALL}")
        lines.append(f"  Max Loss:   {Fore.RED}{max_loss:.2f}%{Style.RESET_ALL}")

        return '\n'.join(lines)

    @staticmethod
    def _format_number(num: float) -> str:
        """Format large numbers with K/M/B suffixes."""
        if num >= 1_000_000_000:
            return f"{num / 1_000_000_000:.2f}B"
        elif num >= 1_000_000:
            return f"{num / 1_000_000:.2f}M"
        elif num >= 1_000:
            return f"{num / 1_000:.2f}K"
        else:
            return f"{num:.0f}"

    @staticmethod
    def error(message: str) -> str:
        """Display an error message."""
        return f"{Fore.RED}{Style.BRIGHT}Error:{Style.RESET_ALL} {message}"

    @staticmethod
    def success(message: str) -> str:
        """Display a success message."""
        return f"{Fore.GREEN}{Style.BRIGHT}✓{Style.RESET_ALL} {message}"

    @staticmethod
    def info(message: str) -> str:
        """Display an info message."""
        return f"{Fore.CYAN}ℹ{Style.RESET_ALL} {message}"
