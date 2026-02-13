
export const fetchExchangeRate = async (): Promise<number | null> => {
    try {
        // Using a free API for exchange rates. Base is USD.
        // We want USD -> IQD
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) {
            throw new Error('Failed to fetch exchange rate');
        }
        const data = await response.json();
        // Check if IQD exists in rates
        const rate = data.rates?.IQD;
        
        if (rate) {
            return rate;
        } else {
            console.warn('IQD rate not found in API response.');
            return null; 
        }
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        return null; 
    }
};
