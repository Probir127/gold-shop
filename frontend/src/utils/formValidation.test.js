import test from 'node:test';
import assert from 'node:assert/strict';
import { isEmail, isPhone, safeReturnPath, validateShipping, validateEnquiry } from './formValidation.js';
import { safeApiUrl } from '../services/safeApiUrl.js';

test('login return path rejects external and ambiguous destinations', () => {
    for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/\nevil.example', null]) assert.equal(safeReturnPath(value), '/account');
    assert.equal(safeReturnPath('/checkout?step=2'), '/checkout?step=2');
});
test('phone and email validation accepts supported details and rejects malformed input', () => {
    assert.equal(isPhone('+880 1712-345678'), true);
    assert.equal(isPhone('123'), false);
    assert.equal(isEmail(' shopper@example.com '), true);
    assert.equal(isEmail('shopper@'), false);
});
test('checkout validates whitespace names and full address as well as contacts', () => {
    const form = { customer_name: 'Ayesha Rahman', customer_phone: '01712345678', customer_email: '', address: 'House 10, Road 2, Dhaka', city: 'Dhaka' };
    assert.equal(validateShipping(form), '');
    assert.match(validateShipping({ ...form, customer_name: '  ' }), /name/);
    assert.match(validateShipping({ ...form, address: 'short' }), /address/);
    assert.match(validateShipping({ ...form, customer_email: 'broken' }), /email/);
    assert.match(validateEnquiry({ name: 'Ayesha', mobile: form.customer_phone, email: '', message: ' '.repeat(20) }), /enquiry/);
});
test('pagination cannot leak authorization outside configured API', () => {
    assert.equal(safeApiUrl('/api/products/?page=2', '/api', 'https://shop.example'), 'https://shop.example/api/products/?page=2');
    assert.throws(() => safeApiUrl('https://evil.example/api/products/', '/api', 'https://shop.example'));
    assert.throws(() => safeApiUrl('/account', '/api', 'https://shop.example'));
    assert.throws(() => safeApiUrl('https://user@shop.example/api/products/', '/api', 'https://shop.example'));
});
