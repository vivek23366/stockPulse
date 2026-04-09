"""
Paper Trading Portfolio Manager
Handles in-memory + JSON-persisted paper trading state.
"""

import json
import os
from typing import Dict, Any, List, Optional

PORTFOLIO_FILE = os.path.join(os.path.dirname(__file__), "portfolio.json")
INITIAL_BALANCE = 10_000.0


def _default() -> Dict[str, Any]:
    return {"balance": INITIAL_BALANCE, "holdings": {}}


def _load() -> Dict[str, Any]:
    if os.path.exists(PORTFOLIO_FILE):
        try:
            with open(PORTFOLIO_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return _default()


def _save(state: Dict[str, Any]) -> None:
    with open(PORTFOLIO_FILE, "w") as f:
        json.dump(state, f, indent=2)


def get_portfolio(get_price_fn) -> Dict[str, Any]:
    state = _load()
    holdings_list = []
    total_market_value = 0.0
    total_cost_basis = 0.0

    for ticker, data in state["holdings"].items():
        price = get_price_fn(ticker) or data["avg_cost"]
        market_value = price * data["shares"]
        cost_basis = data["avg_cost"] * data["shares"]
        pnl = market_value - cost_basis
        pnl_pct = (pnl / cost_basis * 100) if cost_basis > 0 else 0

        total_market_value += market_value
        total_cost_basis += cost_basis

        holdings_list.append({
            "symbol": ticker,
            "shares": data["shares"],
            "avg_cost": data["avg_cost"],
            "current_price": price,
            "market_value": market_value,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
        })

    total_value = state["balance"] + total_market_value
    total_pnl = total_value - INITIAL_BALANCE
    total_pnl_pct = (total_pnl / INITIAL_BALANCE) * 100

    return {
        "balance": round(state["balance"], 2),
        "total_portfolio_value": round(total_value, 2),
        "invested": round(total_cost_basis, 2),
        "market_value": round(total_market_value, 2),
        "pnl": round(total_pnl, 2),
        "pnl_pct": round(total_pnl_pct, 4),
        "holdings": sorted(holdings_list, key=lambda x: x["symbol"]),
    }


def buy(ticker: str, quantity: float, price: float) -> Dict[str, Any]:
    state = _load()
    cost = price * quantity

    if cost > state["balance"]:
        raise ValueError(
            f"Insufficient balance. Need ${cost:,.2f}, available ${state['balance']:,.2f}"
        )

    state["balance"] -= cost

    if ticker in state["holdings"]:
        existing = state["holdings"][ticker]
        total_shares = existing["shares"] + quantity
        total_cost = (existing["avg_cost"] * existing["shares"]) + cost
        existing["avg_cost"] = total_cost / total_shares
        existing["shares"] = total_shares
    else:
        state["holdings"][ticker] = {"shares": quantity, "avg_cost": price}

    _save(state)
    return {
        "success": True,
        "message": f"Bought {quantity} shares of {ticker} @ ${price:,.2f}",
        "total_cost": round(cost, 2),
    }


def sell(ticker: str, quantity: float, price: float) -> Dict[str, Any]:
    state = _load()

    if ticker not in state["holdings"]:
        raise ValueError(f"No holdings found for {ticker}")

    existing = state["holdings"][ticker]
    if quantity > existing["shares"]:
        raise ValueError(
            f"Insufficient shares. Have {existing['shares']:.4f}, tried to sell {quantity}"
        )

    proceeds = price * quantity
    state["balance"] += proceeds
    existing["shares"] -= quantity

    if existing["shares"] < 1e-9:
        del state["holdings"][ticker]

    _save(state)
    return {
        "success": True,
        "message": f"Sold {quantity} shares of {ticker} @ ${price:,.2f}",
        "proceeds": round(proceeds, 2),
    }


def reset() -> Dict[str, Any]:
    state = _default()
    _save(state)
    return {"success": True, "message": "Portfolio reset to $10,000"}
