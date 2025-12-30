"""
Tests for the ASCII charts module.
"""

import pytest
import pandas as pd
from src.charts import ASCIIChart


class TestASCIIChart:
    """Tests for ASCIIChart class."""

    def test_sparkline_basic(self):
        """Test basic sparkline generation."""
        data = [1, 2, 3, 4, 5]
        result = ASCIIChart.sparkline(data)

        assert len(result) == 5
        assert result[0] == ' '  # Lowest value
        assert result[-1] == '█'  # Highest value

    def test_sparkline_empty(self):
        """Test sparkline with empty data."""
        result = ASCIIChart.sparkline([])
        assert result == ""

    def test_sparkline_single_value(self):
        """Test sparkline with single value."""
        result = ASCIIChart.sparkline([5])
        assert len(result) == 1

    def test_sparkline_constant_values(self):
        """Test sparkline with all same values."""
        data = [5, 5, 5, 5, 5]
        result = ASCIIChart.sparkline(data)

        # All characters should be the same (middle character)
        assert len(set(result)) == 1

    def test_sparkline_with_width(self):
        """Test sparkline resampling to specified width."""
        data = list(range(100))
        result = ASCIIChart.sparkline(data, width=10)

        assert len(result) == 10

    def test_horizontal_bar(self):
        """Test horizontal bar generation."""
        bar = ASCIIChart.horizontal_bar(50, 0, 100, width=10)

        assert len(bar) == 10
        assert bar.count('█') == 5
        assert bar.count('░') == 5

    def test_horizontal_bar_full(self):
        """Test horizontal bar at maximum value."""
        bar = ASCIIChart.horizontal_bar(100, 0, 100, width=10)

        assert bar == '█' * 10

    def test_horizontal_bar_empty(self):
        """Test horizontal bar at minimum value."""
        bar = ASCIIChart.horizontal_bar(0, 0, 100, width=10)

        assert bar == '░' * 10

    def test_trend_arrow_up(self):
        """Test trend arrow for positive change."""
        assert ASCIIChart.trend_arrow(5) == '⬆'
        assert ASCIIChart.trend_arrow(1) == '↗'

    def test_trend_arrow_down(self):
        """Test trend arrow for negative change."""
        assert ASCIIChart.trend_arrow(-5) == '⬇'
        assert ASCIIChart.trend_arrow(-1) == '↘'

    def test_trend_arrow_flat(self):
        """Test trend arrow for no change."""
        assert ASCIIChart.trend_arrow(0) == '→'

    def test_mini_chart(self):
        """Test multi-line mini chart generation."""
        data = [1, 2, 3, 4, 5, 4, 3, 2, 1]
        lines = ASCIIChart.mini_chart(data, height=5, width=9)

        assert len(lines) == 5
        assert all(len(line) == 9 for line in lines)

    def test_mini_chart_empty(self):
        """Test mini chart with empty data."""
        lines = ASCIIChart.mini_chart([])
        assert lines == ["No data available"]

    def test_volatility_meter(self):
        """Test volatility meter generation."""
        low_vol = ASCIIChart.volatility_meter(5, max_volatility=50)
        high_vol = ASCIIChart.volatility_meter(45, max_volatility=50)

        assert '🟢' in low_vol
        assert '🔴' in high_vol

    def test_price_sparkline(self):
        """Test sparkline from DataFrame."""
        df = pd.DataFrame({
            'Close': [100, 102, 101, 105, 103]
        })

        result = ASCIIChart.price_sparkline(df, width=5)
        assert len(result) == 5

    def test_price_sparkline_empty_df(self):
        """Test sparkline with empty DataFrame."""
        df = pd.DataFrame()
        result = ASCIIChart.price_sparkline(df)
        assert result == "No data"
