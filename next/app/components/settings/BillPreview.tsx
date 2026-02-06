'use client';

import type { BillCustomization } from '@/lib/escpos';

interface BillPreviewProps {
  customization: BillCustomization;
  paperWidth: number;
}

// Sample data for preview
const SAMPLE_DATA = {
  cartName: 'Table 5',
  serviceType: 'table' as const,
  orderReference: '12345',
  orderTime: new Date().toISOString(),
  customer: { name: 'John Doe', phone: '+1234567890', address: '123 Main St' },
  items: [
    { id: 1, name: 'Cappuccino', quantity: 2, price: 150 },
    { id: 2, name: 'Club Sandwich', quantity: 1, price: 280 },
    { id: 3, name: 'Chocolate Cake', quantity: 1, price: 180 },
  ],
  discountTotal: 50,
  payment: 700,
};

export function BillPreview({ customization, paperWidth }: BillPreviewProps) {
  const widthPx = Math.round(paperWidth * (300 / 80));

  const subtotal = SAMPLE_DATA.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const total = subtotal - SAMPLE_DATA.discountTotal;
  const change = SAMPLE_DATA.payment - total;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Preview</label>
      <div
        className="bg-white text-black p-3 border rounded overflow-auto max-h-[400px]"
        style={{
          width: widthPx,
          fontFamily: 'monospace',
          fontSize: paperWidth >= 70 ? '11px' : '10px',
        }}
      >
        {/* Logo */}
        {customization.logo && (
          <div className="text-center mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- Logo is a base64 data URL from user upload, not optimizable by next/image */}
            <img
              src={customization.logo}
              alt="Logo"
              className="mx-auto"
              style={{ maxWidth: '80%' }}
            />
          </div>
        )}

        {/* Header */}
        {customization.headerText && (
          <div className="text-center mb-2 whitespace-pre-line">
            {customization.headerText}
          </div>
        )}

        <div className="border-t border-dashed border-black my-1" />

        {/* Order Info */}
        <div className="text-center">
          <div className="font-bold">{SAMPLE_DATA.cartName}</div>
          <div>
            {SAMPLE_DATA.customer.name} | {SAMPLE_DATA.customer.phone}
          </div>
          <div>{SAMPLE_DATA.customer.address}</div>
          {customization.showOrderNumber && (
            <div>Invoice#: {SAMPLE_DATA.orderReference}</div>
          )}
          {customization.showDateTime && (
            <div>
              Date: {new Date().toLocaleDateString('en-GB')} Time:{' '}
              {new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-black my-1" />

        {/* Items - table format matching actual print */}
        <table className="w-full text-[10px]">
          <thead>
            <tr className="font-bold">
              <td className="text-left">Item</td>
              <td className="text-right">Qty</td>
              <td className="text-right">Price</td>
              <td className="text-right">Total</td>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_DATA.items.map((item) => (
              <tr key={item.id}>
                <td className="text-left">{item.name}</td>
                <td className="text-right">{item.quantity}</td>
                <td className="text-right">{item.price}</td>
                <td className="text-right">{item.quantity * item.price}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black my-1" />

        {/* Totals */}
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{SAMPLE_DATA.discountTotal}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>{total}</span>
        </div>
        <div className="flex justify-between">
          <span>Payment</span>
          <span>{SAMPLE_DATA.payment}</span>
        </div>
        <div className="flex justify-between">
          <span>Change</span>
          <span>{change}</span>
        </div>

        <div className="border-t border-dashed border-black my-1" />

        {/* Footer */}
        {customization.footerText && (
          <div className="text-center whitespace-pre-line">{customization.footerText}</div>
        )}
      </div>
    </div>
  );
}
