"""
Stock Pulse FastAPI Backend
Wraps existing src/ modules and exposes REST endpoints.
"""

import sys
import os

# Ensure project root is in path so src/ modules are importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import math

import backend.auth as auth_mod

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

# ── Ticker autocomplete database ───────────────────────────────────────────────
TICKER_DB = [
    # Big Tech
    {"symbol": "AAPL",  "name": "Apple Inc."},
    {"symbol": "MSFT",  "name": "Microsoft Corporation"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. (Google)"},
    {"symbol": "GOOG",  "name": "Alphabet Inc. Class C"},
    {"symbol": "AMZN",  "name": "Amazon.com Inc."},
    {"symbol": "META",  "name": "Meta Platforms Inc."},
    {"symbol": "NVDA",  "name": "NVIDIA Corporation"},
    {"symbol": "TSLA",  "name": "Tesla Inc."},
    {"symbol": "NFLX",  "name": "Netflix Inc."},
    {"symbol": "INTC",  "name": "Intel Corporation"},
    {"symbol": "AMD",   "name": "Advanced Micro Devices"},
    {"symbol": "AVGO",  "name": "Broadcom Inc."},
    {"symbol": "QCOM",  "name": "Qualcomm Inc."},
    {"symbol": "TXN",   "name": "Texas Instruments"},
    {"symbol": "AMAT",  "name": "Applied Materials"},
    {"symbol": "MU",    "name": "Micron Technology"},
    {"symbol": "LRCX",  "name": "Lam Research Corporation"},
    {"symbol": "KLAC",  "name": "KLA Corporation"},
    {"symbol": "MRVL",  "name": "Marvell Technology"},
    {"symbol": "ORCL",  "name": "Oracle Corporation"},
    {"symbol": "CRM",   "name": "Salesforce Inc."},
    {"symbol": "NOW",   "name": "ServiceNow Inc."},
    {"symbol": "SNOW",  "name": "Snowflake Inc."},
    {"symbol": "PLTR",  "name": "Palantir Technologies"},
    {"symbol": "UBER",  "name": "Uber Technologies"},
    {"symbol": "LYFT",  "name": "Lyft Inc."},
    {"symbol": "ABNB",  "name": "Airbnb Inc."},
    {"symbol": "DASH",  "name": "DoorDash Inc."},
    {"symbol": "SHOP",  "name": "Shopify Inc."},
    {"symbol": "SQ",    "name": "Block Inc. (Square)"},
    {"symbol": "PYPL",  "name": "PayPal Holdings"},
    {"symbol": "ADBE",  "name": "Adobe Inc."},
    {"symbol": "INTU",  "name": "Intuit Inc."},
    {"symbol": "PANW",  "name": "Palo Alto Networks"},
    {"symbol": "CRWD",  "name": "CrowdStrike Holdings"},
    {"symbol": "ZS",    "name": "Zscaler Inc."},
    {"symbol": "OKTA",  "name": "Okta Inc."},
    {"symbol": "DDOG",  "name": "Datadog Inc."},
    {"symbol": "MDB",   "name": "MongoDB Inc."},
    {"symbol": "NET",   "name": "Cloudflare Inc."},
    {"symbol": "TWLO",  "name": "Twilio Inc."},
    {"symbol": "ZM",    "name": "Zoom Video Communications"},
    {"symbol": "DOCN",  "name": "DigitalOcean Holdings"},
    {"symbol": "GTLB",  "name": "GitLab Inc."},
    # Finance
    {"symbol": "JPM",   "name": "JPMorgan Chase & Co."},
    {"symbol": "BAC",   "name": "Bank of America"},
    {"symbol": "WFC",   "name": "Wells Fargo & Company"},
    {"symbol": "GS",    "name": "Goldman Sachs Group"},
    {"symbol": "MS",    "name": "Morgan Stanley"},
    {"symbol": "C",     "name": "Citigroup Inc."},
    {"symbol": "USB",   "name": "U.S. Bancorp"},
    {"symbol": "AXP",   "name": "American Express Company"},
    {"symbol": "V",     "name": "Visa Inc."},
    {"symbol": "MA",    "name": "Mastercard Inc."},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway Class B"},
    {"symbol": "BLK",   "name": "BlackRock Inc."},
    {"symbol": "SCHW",  "name": "Charles Schwab Corporation"},
    {"symbol": "COF",   "name": "Capital One Financial"},
    {"symbol": "TFC",   "name": "Truist Financial Corporation"},
    {"symbol": "SPGI",  "name": "S&P Global Inc."},
    {"symbol": "ICE",   "name": "Intercontinental Exchange"},
    {"symbol": "CME",   "name": "CME Group Inc."},
    {"symbol": "CB",    "name": "Chubb Limited"},
    {"symbol": "PGR",   "name": "Progressive Corporation"},
    # Healthcare & Pharma
    {"symbol": "JNJ",   "name": "Johnson & Johnson"},
    {"symbol": "PFE",   "name": "Pfizer Inc."},
    {"symbol": "MRNA",  "name": "Moderna Inc."},
    {"symbol": "BNTX",  "name": "BioNTech SE"},
    {"symbol": "ABBV",  "name": "AbbVie Inc."},
    {"symbol": "MRK",   "name": "Merck & Co."},
    {"symbol": "BMY",   "name": "Bristol-Myers Squibb"},
    {"symbol": "LLY",   "name": "Eli Lilly and Company"},
    {"symbol": "AMGN",  "name": "Amgen Inc."},
    {"symbol": "GILD",  "name": "Gilead Sciences"},
    {"symbol": "BIIB",  "name": "Biogen Inc."},
    {"symbol": "REGN",  "name": "Regeneron Pharmaceuticals"},
    {"symbol": "VRTX",  "name": "Vertex Pharmaceuticals"},
    {"symbol": "UNH",   "name": "UnitedHealth Group"},
    {"symbol": "CVS",   "name": "CVS Health Corporation"},
    {"symbol": "CI",    "name": "Cigna Group"},
    {"symbol": "HUM",   "name": "Humana Inc."},
    {"symbol": "ISRG",  "name": "Intuitive Surgical"},
    {"symbol": "SYK",   "name": "Stryker Corporation"},
    {"symbol": "MDT",   "name": "Medtronic plc"},
    # Consumer & Retail
    {"symbol": "WMT",   "name": "Walmart Inc."},
    {"symbol": "COST",  "name": "Costco Wholesale"},
    {"symbol": "TGT",   "name": "Target Corporation"},
    {"symbol": "HD",    "name": "Home Depot Inc."},
    {"symbol": "LOW",   "name": "Lowe's Companies"},
    {"symbol": "NKE",   "name": "Nike Inc."},
    {"symbol": "SBUX",  "name": "Starbucks Corporation"},
    {"symbol": "MCD",   "name": "McDonald's Corporation"},
    {"symbol": "YUM",   "name": "Yum! Brands"},
    {"symbol": "CMG",   "name": "Chipotle Mexican Grill"},
    {"symbol": "DPZ",   "name": "Domino's Pizza"},
    {"symbol": "KO",    "name": "Coca-Cola Company"},
    {"symbol": "PEP",   "name": "PepsiCo Inc."},
    {"symbol": "PM",    "name": "Philip Morris International"},
    {"symbol": "MO",    "name": "Altria Group"},
    {"symbol": "CL",    "name": "Colgate-Palmolive"},
    {"symbol": "PG",    "name": "Procter & Gamble"},
    {"symbol": "KMB",   "name": "Kimberly-Clark"},
    {"symbol": "EL",    "name": "Estée Lauder Companies"},
    {"symbol": "ULTA",  "name": "Ulta Beauty"},
    # Energy
    {"symbol": "XOM",   "name": "ExxonMobil Corporation"},
    {"symbol": "CVX",   "name": "Chevron Corporation"},
    {"symbol": "COP",   "name": "ConocoPhillips"},
    {"symbol": "SLB",   "name": "Schlumberger (SLB)"},
    {"symbol": "EOG",   "name": "EOG Resources"},
    {"symbol": "PXD",   "name": "Pioneer Natural Resources"},
    {"symbol": "OXY",   "name": "Occidental Petroleum"},
    {"symbol": "HAL",   "name": "Halliburton Company"},
    {"symbol": "DVN",   "name": "Devon Energy"},
    {"symbol": "MPC",   "name": "Marathon Petroleum"},
    # Industrials & Aerospace
    {"symbol": "BA",    "name": "Boeing Company"},
    {"symbol": "LMT",   "name": "Lockheed Martin"},
    {"symbol": "RTX",   "name": "RTX Corporation (Raytheon)"},
    {"symbol": "NOC",   "name": "Northrop Grumman"},
    {"symbol": "GD",    "name": "General Dynamics"},
    {"symbol": "GE",    "name": "GE Aerospace"},
    {"symbol": "HON",   "name": "Honeywell International"},
    {"symbol": "MMM",   "name": "3M Company"},
    {"symbol": "CAT",   "name": "Caterpillar Inc."},
    {"symbol": "DE",    "name": "Deere & Company"},
    {"symbol": "EMR",   "name": "Emerson Electric"},
    {"symbol": "ETN",   "name": "Eaton Corporation"},
    {"symbol": "ROK",   "name": "Rockwell Automation"},
    {"symbol": "UPS",   "name": "United Parcel Service"},
    {"symbol": "FDX",   "name": "FedEx Corporation"},
    # Telecom & Media
    {"symbol": "T",     "name": "AT&T Inc."},
    {"symbol": "VZ",    "name": "Verizon Communications"},
    {"symbol": "TMUS",  "name": "T-Mobile US Inc."},
    {"symbol": "DIS",   "name": "Walt Disney Company"},
    {"symbol": "CMCSA", "name": "Comcast Corporation"},
    {"symbol": "WBD",   "name": "Warner Bros. Discovery"},
    {"symbol": "PARA",  "name": "Paramount Global"},
    {"symbol": "SPOT",  "name": "Spotify Technology"},
    # Automotive
    {"symbol": "F",     "name": "Ford Motor Company"},
    {"symbol": "GM",    "name": "General Motors"},
    {"symbol": "RIVN",  "name": "Rivian Automotive"},
    {"symbol": "LCID",  "name": "Lucid Group"},
    {"symbol": "NIO",   "name": "NIO Inc."},
    {"symbol": "LI",    "name": "Li Auto Inc."},
    {"symbol": "XPEV",  "name": "XPeng Inc."},
    # Real Estate & Utilities
    {"symbol": "AMT",   "name": "American Tower REIT"},
    {"symbol": "PLD",   "name": "Prologis Inc."},
    {"symbol": "EQIX",  "name": "Equinix Inc."},
    {"symbol": "SPG",   "name": "Simon Property Group"},
    {"symbol": "NEE",   "name": "NextEra Energy"},
    {"symbol": "DUK",   "name": "Duke Energy"},
    {"symbol": "SO",    "name": "Southern Company"},
    {"symbol": "D",     "name": "Dominion Energy"},
    # ETFs & Index
    {"symbol": "SPY",   "name": "SPDR S&P 500 ETF"},
    {"symbol": "QQQ",   "name": "Invesco QQQ (NASDAQ-100)"},
    {"symbol": "DIA",   "name": "SPDR Dow Jones ETF"},
    {"symbol": "IWM",   "name": "iShares Russell 2000 ETF"},
    {"symbol": "VTI",   "name": "Vanguard Total Stock Market ETF"},
    {"symbol": "VOO",   "name": "Vanguard S&P 500 ETF"},
    {"symbol": "ARKK",  "name": "ARK Innovation ETF"},
    {"symbol": "GLD",   "name": "SPDR Gold Shares ETF"},
    {"symbol": "SLV",   "name": "iShares Silver Trust ETF"},
    {"symbol": "USO",   "name": "United States Oil Fund ETF"},
    {"symbol": "TLT",   "name": "iShares 20+ Year Treasury ETF"},
    # Crypto-adjacent
    {"symbol": "COIN",  "name": "Coinbase Global"},
    {"symbol": "MSTR",  "name": "MicroStrategy Inc."},
    {"symbol": "MARA",  "name": "Marathon Digital Holdings"},
    {"symbol": "RIOT",  "name": "Riot Platforms"},
    # Airlines & Travel
    {"symbol": "AAL",   "name": "American Airlines Group"},
    {"symbol": "DAL",   "name": "Delta Air Lines"},
    {"symbol": "UAL",   "name": "United Airlines Holdings"},
    {"symbol": "LUV",   "name": "Southwest Airlines"},
    {"symbol": "MAR",   "name": "Marriott International"},
    {"symbol": "HLT",   "name": "Hilton Worldwide"},
    {"symbol": "CCL",   "name": "Carnival Corporation"},
    {"symbol": "RCL",   "name": "Royal Caribbean Group"},
    # Global
    {"symbol": "TSM",   "name": "Taiwan Semiconductor (TSMC)"},
    {"symbol": "BABA",  "name": "Alibaba Group"},
    {"symbol": "JD",    "name": "JD.com Inc."},
    {"symbol": "PDD",   "name": "PDD Holdings (Temu/Pinduoduo)"},
    {"symbol": "BIDU",  "name": "Baidu Inc."},
    {"symbol": "SAP",   "name": "SAP SE"},
    {"symbol": "ASML",  "name": "ASML Holding"},
    {"symbol": "TM",    "name": "Toyota Motor Corporation"},
    {"symbol": "HMC",   "name": "Honda Motor Company"},
    {"symbol": "NVS",   "name": "Novartis AG"},
    {"symbol": "AZN",   "name": "AstraZeneca plc"},
]



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

    # Risk level from annual volatility
    ann_vol = safe(volatility["annual_volatility"]) if volatility else 0
    if ann_vol < 15:
        risk_level = "Low"
    elif ann_vol < 30:
        risk_level = "Medium"
    elif ann_vol < 50:
        risk_level = "High"
    else:
        risk_level = "Extreme"

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
        "annual_volatility": ann_vol,
        "atr": safe(volatility["atr"]) if volatility else 0,
        "max_gain": safe(volatility["max_daily_gain"]) if volatility else 0,
        "max_loss": safe(volatility["max_daily_loss"]) if volatility else 0,
        "risk_level": risk_level,
        "day_high": safe(info["day_high"]),
        "day_low": safe(info["day_low"]),
        "day_range": f"${safe(info['day_low']):.2f} – ${safe(info['day_high']):.2f}",
        "volume": safe(info["volume"]),
        "market_cap": safe(info["market_cap"]),
        "fifty_two_week_high": safe(info["fifty_two_week_high"]),
        "fifty_two_week_low": safe(info["fifty_two_week_low"]),
        "week52_range": f"${safe(info['fifty_two_week_low']):.2f} – ${safe(info['fifty_two_week_high']):.2f}",
        "currency": info["currency"],
        "sparkline": sparkline,
    }


@app.get("/search")
def search_tickers(q: str = Query("", description="Partial ticker symbol or company name")):
    """
    Autocomplete endpoint — returns matching tickers from the built-in database.
    Matches if the query appears at the start of the symbol (priority) or
    anywhere in the company name. Returns at most 8 results.
    """
    q = q.strip().upper()
    if not q:
        return {"results": []}

    q_lower = q.lower()
    starts   = []  # symbol starts with q  (highest priority)
    contains = []  # company name contains q_lower (lower priority)

    for item in TICKER_DB:
        sym  = item["symbol"].upper()
        name = item["name"].lower()
        if sym.startswith(q):
            starts.append(item)
        elif q_lower in name:
            contains.append(item)

    results = (starts + contains)[:8]
    return {"results": results}


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
def market_pulse(tickers: Optional[str] = Query(None, description="Comma-separated tickers e.g. AAPL,TSLA,MSFT")):
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()] if tickers else DEFAULT_PULSE_STOCKS
    if not ticker_list:
        raise HTTPException(status_code=400, detail="No tickers provided")
    pulse = analyzer.get_market_pulse(ticker_list)
    comparisons = analyzer.compare_stocks(ticker_list)
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
        "tickers_analyzed": ticker_list,
    }


@app.get("/watch/{ticker}")
def watch_stock(ticker: str):
    return _build_stock_response(ticker.upper())


@app.get("/portfolio")
def get_portfolio():
    return ptf.get_portfolio(_get_live_price)


# ── Auth Models ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: str

class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/register")
def register(req: RegisterRequest):
    """
    Create a new user account.
    Returns a JWT token on success.
    """
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    if "@" not in req.email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    try:
        user = auth_mod.create_user(
            username=req.username.strip(),
            password=req.password,
            name=req.name.strip(),
            email=req.email.strip(),
        )
    except ValueError as exc:
        msg = str(exc)
        if msg == "username_taken":
            raise HTTPException(status_code=409, detail="Username is already taken")
        if msg == "email_taken":
            raise HTTPException(status_code=409, detail="Email address already registered")
        raise HTTPException(status_code=400, detail=msg)

    token = auth_mod.create_token(user["username"])
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password"},
    }


@app.post("/auth/login")
def login(req: LoginRequest):
    """
    Authenticate a user and return a JWT token.
    """
    user = auth_mod.authenticate(req.username.strip(), req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = auth_mod.create_token(user["username"])
    return {
        "token": token,
        "user": user,
    }


@app.get("/auth/me")
def get_me(authorization: Optional[str] = Header(None)):
    """
    Verify a JWT token and return the current user's profile.
    Expects:  Authorization: Bearer <token>
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed token")
    token = authorization[len("Bearer "):]
    username = auth_mod.decode_token(token)
    if not username:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    user = auth_mod.get_user(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {k: v for k, v in user.items() if k != "password"}


# ── Trading Models ────────────────────────────────────────────────────────────

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
