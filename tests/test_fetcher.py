"""
Tests for the stock fetcher module.
"""

import pytest
from src.fetcher import StockFetcher, validate_ticker


class TestStockFetcher:
    """Tests for StockFetcher class."""

    @pytest.fixture
    def fetcher(self):
        """Create a StockFetcher instance."""
        return StockFetcher()

    def test_get_stock_info_valid_ticker(self, fetcher):
        """Test fetching info for a valid stock ticker."""
        info = fetcher.get_stock_info('AAPL')

        assert info is not None
        assert info['symbol'] == 'AAPL'
        assert 'price' in info
        assert info['price'] > 0
        assert 'name' in info

    def test_get_stock_info_invalid_ticker(self, fetcher):
        """Test fetching info for an invalid stock ticker."""
        info = fetcher.get_stock_info('INVALIDTICKER123')

        assert info is None

    def test_get_historical_data_valid(self, fetcher):
        """Test fetching historical data for a valid ticker."""
        hist = fetcher.get_historical_data('AAPL', period='5d')

        assert hist is not None
        assert not hist.empty
        assert 'Close' in hist.columns
        assert 'Open' in hist.columns
        assert 'High' in hist.columns
        assert 'Low' in hist.columns

    def test_get_historical_data_invalid(self, fetcher):
        """Test fetching historical data for an invalid ticker."""
        hist = fetcher.get_historical_data('INVALIDTICKER123')

        assert hist is None or hist.empty

    def test_get_price_change(self, fetcher):
        """Test calculating price change."""
        change = fetcher.get_price_change('AAPL')

        assert change is not None
        assert 'change' in change
        assert 'change_percent' in change
        assert 'direction' in change
        assert change['direction'] in ['up', 'down', 'flat']

    def test_get_multiple_stocks(self, fetcher):
        """Test fetching multiple stocks at once."""
        tickers = ['AAPL', 'GOOGL', 'MSFT']
        results = fetcher.get_multiple_stocks(tickers)

        assert len(results) == 3
        assert 'AAPL' in results
        assert 'GOOGL' in results
        assert 'MSFT' in results


class TestValidateTicker:
    """Tests for the validate_ticker function."""

    def test_valid_ticker(self):
        """Test validation of a valid ticker."""
        assert validate_ticker('AAPL') is True
        assert validate_ticker('aapl') is True  # Case insensitive

    def test_invalid_ticker(self):
        """Test validation of an invalid ticker."""
        assert validate_ticker('INVALIDTICKER123') is False
        assert validate_ticker('') is False
