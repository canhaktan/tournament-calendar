export type Currency = 'TRY' | 'USD' | 'EUR';

// API Key from .env
const API_KEY = import.meta.env.VITE_FXRATES_API_KEY;

export interface RateInfo {
    rates: Record<Currency, number>;
    lastUpdated: number; // timestamp
    source: 'Default' | 'Live';
}

// Initialize with Cached Rates or Empty State (No fake defaults)
let currentRateInfo: RateInfo = {
    rates: { 'TRY': 1, 'USD': 0, 'EUR': 0 }, // 0 indicates not fetched yet
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

export const fetchExchangeRates = async (auto = false) => {
    try {
        if (auto) {
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            const now = Date.now();
            if (now - currentRateInfo.lastUpdated < ONE_DAY_MS) {
                console.log("-----------------------------------------");
                console.log("Currency rates are fresh (Skipping Auto-Fetch)");
                console.log(`Last Updated: ${new Date(currentRateInfo.lastUpdated).toLocaleString()}`);
                console.log("Current Rates:", currentRateInfo.rates);
                console.log("-----------------------------------------");
                return false; // Skipped
            }
        }

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

            console.log("-----------------------------------------");
            console.log('Currency rates UPDATED & CACHED:', EXCHANGE_RATES);
            console.log(`Time: ${new Date().toLocaleString()}`);
            console.log("-----------------------------------------");
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
    const rateFrom = EXCHANGE_RATES[from];
    const rateTo = EXCHANGE_RATES[to];

    // Safety check for uninitialized rates (avoid division by zero)
    if (!rateFrom || !rateTo) return 0;

    const amountInTry = amount * rateFrom;

    // Convert from TRY to target
    return amountInTry / rateTo;
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
