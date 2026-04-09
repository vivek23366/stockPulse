import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getStock    = (ticker)  => api.get(`/stock/${ticker}`)
export const compareStocks = (tickers) => api.get('/compare', { params: { tickers: tickers.join(',') } })
export const getMarketPulse = (tickers) => api.get('/pulse', tickers && tickers.length ? { params: { tickers: tickers.join(',') } } : {})
export const watchStock  = (ticker)  => api.get(`/watch/${ticker}`)
export const getPortfolio = ()        => api.get('/portfolio')
export const buyStock    = (ticker, quantity) => api.post('/buy',  { ticker, quantity })
export const sellStock   = (ticker, quantity) => api.post('/sell', { ticker, quantity })
export const resetPortfolio = ()      => api.post('/reset')
