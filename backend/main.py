"""
Stock Pulse FastAPI Backend
Wraps existing src/ modules and exposes REST endpoints.
"""

import sys
import os

# Ensure project root is in path so src/ modules are importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import math

from src.fetcher import StockFetcher
from src.analyzer import StockAnalyzer
import backend.portfolio as ptf

app = FastAPI(title="Stock Pulse API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fetcher = StockFetcher()
analyzer = StockAnalyzer()

DEFAULT_PULSE_STOCKS = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "META", "NVDA", "JPM"]


def safe(v, default=0):
    """Convert numpy/float to JSON-safe Python float, replacing NaN/Inf with default."""
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (TypeError, ValueError):
        return default


def safe_str(v, default="unknown"):
    try:
        return str(v) if v is not None else default
    except Exception:
        return default


def _get_live_price(ticker: str) -> Optional[float]:
    info = fetcher.get_stock_info(ticker)
    return info["price"] if info else None


def _build_stock_response(ticker: str):
    info = fetcher.get_stock_info(ticker)
    if not info:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker}' not found")

    change = fetcher.get_price_change(ticker)
    volatility = analyzer.calculate_volatility(ticker)
    trend = analyzer.calculate_trend(ticker)
    hist = fetcher.get_historical_data(ticker, period="1mo")

    sparkline = []
    if hist is not None:
        sparkline = [
            {"date": str(idx.date()), "close": safe(v)}
            for idx, v in zip(hist.index, hist["Close"])
            if not math.isnan(float(v))
        ]

    return {
        "symbol": info["symbol"],
        "name": info["name"],
        "price": safe(info["price"]),
        "previous_close": safe(info["previous_close"]),
        "change": safe(change["change"]) if change else 0,
        "change_percent": safe(change["change_percent"]) if change else 0,
        "trend": safe_str(trend["trend"]) if trend else "unknown",
        "trend_strength": safe(trend["strength"]) if trend else 0,
        "support": safe(trend["support"]) if trend else 0,
        "resistance": safe(trend["resistance"]) if trend else 0,
        "volatility": safe(volatility["daily_volatility"]) if volatility else 0,
        "annual_volatility": safe(volatility["annual_volatility"]) if volatility else 0,
        "atr": safe(volatility["atr"]) if volatility else 0,
        "day_high": safe(info["day_high"]),
        "day_low": safe(info["day_low"]),
        "volume": safe(info["volume"]),
        "market_cap": safe(info["market_cap"]),
        "fifty_two_week_high": safe(info["fifty_two_week_high"]),
        "fifty_two_week_low": safe(info["fifty_two_week_low"]),
        "currency": info["currency"],
        "sparkline": sparkline,
    }


@app.get("/stock/{ticker}")
def get_stock(ticker: str):
    return _build_stock_response(ticker.upper())


@app.get("/compare")
def compare_stocks(tickers: str = Query(..., description="Comma-separated tickers e.g. AAPL,TSLA,MSFT")):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not ticker_list:
        raise HTTPException(status_code=400, detail="No tickers provided")

    comparisons = analyzer.compare_stocks(ticker_list)
    if not comparisons:
        raise HTTPException(status_code=404, detail="Could not fetch data for any provided ticker")

    # Sanitize numpy floats
    safe_stocks = [
        {k: (safe(v) if isinstance(v, (int, float)) else safe_str(v) if k in ("trend",) else v)
         for k, v in s.items()}
        for s in comparisons
    ]
    return {"stocks": safe_stocks}


@app.get("/pulse")
def market_pulse():
    pulse = analyzer.get_market_pulse(DEFAULT_PULSE_STOCKS)
    comparisons = analyzer.compare_stocks(DEFAULT_PULSE_STOCKS)
    # Sanitize all floats in pulse dict
    safe_pulse = {k: (safe(v) if isinstance(v, (int, float)) else v) for k, v in pulse.items()}
    safe_stocks = [
        {k: (safe(v) if isinstance(v, (int, float)) else safe_str(v) if k in ("trend",) else v)
         for k, v in s.items()}
        for s in comparisons
    ]
    return {
        **safe_pulse,
        "stocks": safe_stocks,
        "tickers_analyzed": DEFAULT_PULSE_STOCKS,
    }


@app.get("/watch/{ticker}")
def watch_stock(ticker: str):
    return _build_stock_response(ticker.upper())


@app.get("/portfolio")
def get_portfolio():
    return ptf.get_portfolio(_get_live_price)


class BuyRequest(BaseModel):
    ticker: str
    quantity: float


class SellRequest(BaseModel):
    ticker: str
    quantity: float


@app.post("/buy")
def buy_stock(req: BuyRequest):
    ticker = req.ticker.upper()
    price = _get_live_price(ticker)
    if price is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch price for {ticker}")
    try:
        return ptf.buy(ticker, req.quantity, price)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sell")
def sell_stock(req: SellRequest):
    ticker = req.ticker.upper()
    price = _get_live_price(ticker)
    if price is None:
        raise HTTPException(status_code=404, detail=f"Could not fetch price for {ticker}")
    try:
        return ptf.sell(ticker, req.quantity, price)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/reset")
def reset_portfolio():
    return ptf.reset()
