'use client';

import { PrintJobData } from '@/stores/print';

interface BillPrintProps {
  data: PrintJobData;
}

export default function BillPrint({ data }: BillPrintProps) {
  const {
    items = [],
    customer,
    orderReference,
    orderTime,
    payment = 0,
    discountTotal = 0,
    cartName,
  } = data;

  const filteredItems = items.filter(item => item.quantity > 0);

  const subtotal = filteredItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const total = subtotal - discountTotal;
  const change = payment - total;

  const formatCurrency = (amount: number) => amount.toFixed(0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB');
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString();
  };

  const humanizeCartName = (name?: string) => {
    if (!name) return '';
    if (/T[^a-zA-Z]/g.test(name)) return 'Table ' + name.slice(2);
    if (/D[^a-zA-Z]/g.test(name)) return 'Home Delivery';
    if (/P[^a-zA-Z]/g.test(name)) return 'Take away';
    return name;
  };

  const complexItemName = (name: string) => {
    const parts = name.split(':').map(part => part.trim());
    const subItems = parts.length > 1
      ? parts[1].split(',').map(part => part.trim())
      : [];
    return { name: parts[0], subItems };
  };

  const hasCustomerInfo = customer && (customer.name || customer.phone);

  return (
    <div className="bill-print">
      {/* Header with Logo */}
      <header className="brand">
        <div className="logo">
          {/* Logo placeholder - replace with your logo */}
          <svg viewBox="0 0 100 40" className="w-1/2 mx-auto">
            <text x="50" y="30" textAnchor="middle" className="text-xl font-bold">LOGO</text>
          </svg>
        </div>
        <p className="text-xs mb-2">
          <strong>Phone:</strong> 01765553555 <br />
          Girls School Road, Chhatak, Sunamganj
        </p>
      </header>

      {/* Order Info */}
      {filteredItems.length > 0 && (
        <header className="order-info">
          <p className="my-1 text-sm">
            {humanizeCartName(cartName)}
            {hasCustomerInfo && (
              <>
                <br />
                <span>
                  {customer?.name}
                  {customer?.name && customer?.phone && ' | '}
                  {customer?.phone}
                </span>
              </>
            )}
          </p>
          <p className="text-sm my-1">Invoice#: {orderReference}</p>
          <p className="text-sm my-1">
            Date: <strong>{formatDate(orderTime)}</strong>{' '}
            Time: <strong>{formatTime(orderTime)}</strong>
          </p>
        </header>
      )}

      {/* Line Items */}
      {filteredItems.length > 0 && (
        <main>
          <table className="line-items">
            <thead>
              <tr>
                <td className="pr-1 text-left">Item</td>
                <td className="px-1">Qty</td>
                <td className="px-1">Price</td>
                <td className="pl-1 text-right">T.Price</td>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const { name, subItems } = complexItemName(item.name);
                return (
                  <tr key={item.id}>
                    <td className="pr-1">
                      {name}
                      {subItems.length > 0 && (
                        <ul className="ml-4">
                          {subItems.map((subItem, idx) => (
                            <li key={idx}>{subItem}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-1">{item.quantity}</td>
                    <td className="px-1 text-right">{formatCurrency(item.price)}</td>
                    <td className="pl-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <hr className="my-2 border-dashed" />

          {/* Summary */}
          <table className="receipt-summary text-sm">
            <tbody>
              {discountTotal > 0 && (
                <tr>
                  <td className="w-full">Discount</td>
                  <td className="text-right">-{formatCurrency(discountTotal)}</td>
                </tr>
              )}
              <tr>
                <td className="w-full">Total</td>
                <td className="text-right font-bold">{formatCurrency(total)}</td>
              </tr>
              {payment > 0 && (
                <>
                  <tr>
                    <td className="w-full">Payment</td>
                    <td className="text-right">{formatCurrency(payment)}</td>
                  </tr>
                  <tr>
                    <td className="w-full">Change</td>
                    <td className="text-right">{formatCurrency(change)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </main>
      )}

      {/* Footer */}
      <footer className="mt-4">
        <p className="text-xs">
          Online menu: <strong>www.mycozy.cafe/menu</strong>
          <br />
          Call us for home delivery!
        </p>
      </footer>

      <style jsx>{`
        .bill-print {
          font-family: monospace;
          color: black;
          background: white;
          padding: 8px;
        }

        .bill-print * {
          color: black !important;
        }

        .brand {
          text-align: center;
          border-bottom: 1px dashed black;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .order-info {
          text-align: center;
          margin-bottom: 8px;
        }

        .line-items {
          width: 100%;
          font-size: 12px;
        }

        .line-items thead tr td {
          border-bottom: 1px solid black;
          padding-bottom: 4px;
        }

        .line-items tbody tr td {
          padding: 2px 0;
          vertical-align: top;
        }

        .receipt-summary {
          width: 100%;
        }

        .receipt-summary td {
          padding: 2px 0;
        }

        footer {
          text-align: center;
          border-top: 1px dashed black;
          padding-top: 8px;
        }
      `}</style>
    </div>
  );
}
