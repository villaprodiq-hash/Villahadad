/**
 * Formats a phone number for WhatsApp and returns a wa.me link.
 * Handles Iraqi numbers (e.g., 0770... -> +964770...)
 */
export const getWhatsAppUrl = (phone: string, message?: string) => {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Iraqi format: starts with 07... (11 digits usually)
    if (cleaned.startsWith('07') && cleaned.length >= 10) {
        cleaned = '964' + cleaned.substring(1);
    } 
    // If it starts with 7... (missing zero), assume Iraq
    else if (cleaned.startsWith('7') && cleaned.length === 10) {
        cleaned = '964' + cleaned;
    }
    
    // Ensure it doesn't already have triple zero or plus, wa.me just needs digits
    const baseUrl = `https://wa.me/${cleaned}`;
    
    if (message) {
        return `${baseUrl}?text=${encodeURIComponent(message)}`;
    }
    
    return baseUrl;
};
