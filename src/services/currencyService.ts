export type Currency = 'TRY' | 'USD' | 'EUR';

// API Key from .env
const API_KEY = import.meta.env.VITE_FXRATES_API_KEY;

export interface RateInfo {
    rates: Record<Currency, number>;
    lastUpdated: number; // timestamp
    source: 'Default' | 'Live';
}

const DEFAULT_RATES: Record<Currency, number> = {
    'TRY': 1,
    'USD': 42.50,
    'EUR': 44.50
};

// Initialize with Cached Rates or Fallbacks
let currentRateInfo: RateInfo = {
    rates: DEFAULT_RATES,
    lastUpdated: 0,
    source: 'Default'
};

try {
    const cached = localStorage.getItem('exchangeRatesInfo');
    if (cached) {
        currentRateInfo = JSON.parse(cached);
    }
} catch (e) {
    console.error("Failed to parse cached rates", e);
}

// Keep the module-level variable for the convert function sync access
let EXCHANGE_RATES = currentRateInfo.rates;

export const getRateInfo = () => currentRateInfo;

export const fetchExchangeRates = async () => {
    try {
        console.log("Fetching live currency rates from FxRatesAPI...");

        let url = 'https://api.fxratesapi.com/latest?base=TRY';

        if (API_KEY && API_KEY !== 'YOUR_ACCESS_TOKEN_HERE') {
            url += `&api_key=${API_KEY}`;
        } else {
            console.warn("Using FxRatesAPI without a VITE_FXRATES_API_KEY. Rates might be limited or cached. Check .env file.");
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data && data.success && data.rates) {
            // API returns 1 TRY = X USD. We need 1 USD = Y TRY.
            EXCHANGE_RATES = {
                'TRY': 1,
                'USD': 1 / data.rates.USD,
                'EUR': 1 / data.rates.EUR
            };

            // Update info
            currentRateInfo = {
                rates: EXCHANGE_RATES,
                lastUpdated: Date.now(),
                source: 'Live'
            };

            // Cache the new info
            localStorage.setItem('exchangeRatesInfo', JSON.stringify(currentRateInfo));

            console.log('Currency rates updated & cached:', EXCHANGE_RATES);
            return true;
        } else {
            console.warn('FxRatesAPI returned data but success was false', data);
            return false;
        }
    } catch (error) {
        console.error('Failed to fetch from FxRatesAPI:', error);
        return false;
    }
};

export const convertCurrency = (amount: number, from: Currency, to: Currency): number => {
    if (from === to) return amount;

    // Ensure we are using the latest rates (in case they were updated but variable assignment didn't propagate - though it should as it's a let)
    EXCHANGE_RATES = currentRateInfo.rates;

    // Convert to TRY first (Base)
    const amountInTry = amount * EXCHANGE_RATES[from];

    // Convert from TRY to target
    return amountInTry / EXCHANGE_RATES[to];
};

export const formatCurrency = (amount: number, currency: Currency): string => {
    // English formatting for consistency
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};
