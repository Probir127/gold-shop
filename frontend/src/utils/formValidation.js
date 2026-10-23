export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) && String(value).trim().length <= 254;
export const isPhone = (value) => /^(?:\+?88)?01[3-9]\d{8}$/.test(String(value).replace(/[\s()-]/g, ''));
export const safeReturnPath = (value) => /^\/(?!\/)[^\\]*$/.test(value || '') && !/[\u0000-\u001f]/.test(value) ? value : '/account';
export function validateShipping(form) {
    if (form.customer_name.trim().length < 2 || form.customer_name.trim().length > 150) return 'Enter your full name (2–150 characters).';
    if (!isPhone(form.customer_phone)) return 'Enter a valid Bangladesh mobile number, such as 01712345678.';
    if (form.customer_email.trim() && !isEmail(form.customer_email)) return 'Enter a valid email address.';
    if (form.address.trim().length < 10 || form.address.trim().length > 1000) return 'Enter your complete delivery address (10–1,000 characters).';
    if (!form.city.trim() || form.city.length > 100) return 'Select your delivery city.';
    return '';
}
export function validateEnquiry(form) {
    if (form.name.trim().length < 2 || form.name.trim().length > 150) return 'Enter your full name (2–150 characters).';
    if (!isPhone(form.mobile)) return 'Enter a valid Bangladesh mobile number.';
    if (form.email.trim() && !isEmail(form.email)) return 'Enter a valid email address.';
    if (form.message.trim().length < 10 || form.message.trim().length > 5000) return 'Your enquiry must be between 10 and 5,000 characters.';
    return '';
}
