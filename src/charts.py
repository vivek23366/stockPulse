"""
ASCII chart generator for terminal visualization.
Creates sparklines and mini bar charts from stock data.
"""

from typing import List, Optional
import pandas as pd


class ASCIIChart:
    """Generate ASCII-based charts for terminal display."""

    # Sparkline characters (Unicode block elements)
    SPARK_CHARS = ' ▁▂▃▄▅▆▇█'

    # Simple bar characters
    BAR_FILLED = '█'
    BAR_EMPTY = '░'

    @classmethod
    def sparkline(cls, data: List[float], width: Optional[int] = None) -> str:
        """
        Create a sparkline from a list of values.

        Args:
            data: List of numeric values
            width: Optional width to resample data

        Returns:
            String sparkline representation
        """
        if not data or len(data) == 0:
            return ""

        # Resample if width specified
        if width and len(data) > width:
            step = len(data) / width
            data = [data[int(i * step)] for i in range(width)]

        # Handle edge case of all same values
        min_val = min(data)
        max_val = max(data)

        if max_val == min_val:
            return cls.SPARK_CHARS[4] * len(data)

        # Normalize and map to sparkline characters
        chars = []
        for val in data:
            normalized = (val - min_val) / (max_val - min_val)
            index = int(normalized * (len(cls.SPARK_CHARS) - 1))
            chars.append(cls.SPARK_CHARS[index])

        return ''.join(chars)

    @classmethod
    def price_sparkline(cls, df: pd.DataFrame, width: int = 20) -> str:
        """
        Create a sparkline from a DataFrame with 'Close' prices.

        Args:
            df: DataFrame with 'Close' column
            width: Desired width of sparkline

        Returns:
            String sparkline representation
        """
        if df is None or df.empty or 'Close' not in df.columns:
            return "No data"

        prices = df['Close'].tolist()
        return cls.sparkline(prices, width)

    @classmethod
    def horizontal_bar(
        cls,
        value: float,
        min_val: float,
        max_val: float,
        width: int = 20
    ) -> str:
        """
        Create a horizontal bar chart.

        Args:
            value: Current value
            min_val: Minimum value for scale
            max_val: Maximum value for scale
            width: Width of the bar

        Returns:
            String bar representation
        """
        if max_val == min_val:
            filled = width // 2
        else:
            normalized = (value - min_val) / (max_val - min_val)
            filled = int(normalized * width)

        filled = max(0, min(width, filled))
        return cls.BAR_FILLED * filled + cls.BAR_EMPTY * (width - filled)

    @classmethod
    def trend_arrow(cls, change_percent: float) -> str:
        """
        Get a trend arrow based on percentage change.

        Args:
            change_percent: Percentage change value

        Returns:
            Trend arrow character
        """
        if change_percent > 2:
            return '⬆'
        elif change_percent > 0:
            return '↗'
        elif change_percent < -2:
            return '⬇'
        elif change_percent < 0:
            return '↘'
        else:
            return '→'

    @classmethod
    def mini_chart(cls, data: List[float], height: int = 5, width: int = 20) -> List[str]:
        """
        Create a multi-line mini chart.

        Args:
            data: List of numeric values
            height: Number of lines for the chart
            width: Width of the chart

        Returns:
            List of strings representing chart lines
        """
        if not data:
            return ["No data available"]

        # Resample if needed
        if len(data) > width:
            step = len(data) / width
            data = [data[int(i * step)] for i in range(width)]

        min_val = min(data)
        max_val = max(data)

        if max_val == min_val:
            # Flat line in the middle
            lines = []
            for i in range(height):
                if i == height // 2:
                    lines.append('─' * len(data))
                else:
                    lines.append(' ' * len(data))
            return lines

        # Build the chart from top to bottom
        lines = []
        for row in range(height):
            line = ''
            threshold = max_val - (row + 0.5) * (max_val - min_val) / height

            for val in data:
                if val >= threshold:
                    line += '█'
                elif val >= threshold - (max_val - min_val) / height / 2:
                    line += '▄'
                else:
                    line += ' '

            lines.append(line)

        return lines

    @classmethod
    def volatility_meter(cls, volatility: float, max_volatility: float = 50) -> str:
        """
        Create a visual volatility meter.

        Args:
            volatility: Current volatility value
            max_volatility: Maximum expected volatility

        Returns:
            Visual meter string
        """
        normalized = min(volatility / max_volatility, 1.0)
        segments = int(normalized * 10)

        meter = ''
        for i in range(10):
            if i < segments:
                if i < 3:
                    meter += '🟢'
                elif i < 6:
                    meter += '🟡'
                else:
                    meter += '🔴'
            else:
                meter += '⚪'

        return meter
