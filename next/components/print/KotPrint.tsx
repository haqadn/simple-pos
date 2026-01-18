'use client';

import { PrintJobData } from '@/stores/print';

interface KotPrintProps {
  data: PrintJobData;
}

export default function KotPrint({ data }: KotPrintProps) {
  const {
    kotItems = [],
    orderReference,
    frontendId,
    serverId,
    cartName,
    customerNote,
  } = data;

  // Use frontend ID as primary order identifier, fall back to orderReference for legacy orders
  const displayOrderNumber = frontendId || orderReference;

  return (
    <div className="kot-print">
      {/* Header */}
      <header>
        <p className="cart-name">{cartName}</p>
        {displayOrderNumber && (
          <p className="order-ref">Order# {displayOrderNumber}</p>
        )}
        {serverId && frontendId && (
          <p className="server-ref">Ref: #{serverId}</p>
        )}
      </header>

      {/* Items Table */}
      <main>
        <table className="kot-items">
          <thead>
            <tr>
              <td>Item</td>
              <td className="text-right">Qty</td>
            </tr>
          </thead>
          <tbody>
            {kotItems.map(item => {
              // Truly new item: not in previous KOT at all
              const isTrulyNewItem = item.previousQuantity === undefined;
              // Item was previously removed (quantity was 0) and is being re-added
              const wasRemoved = item.previousQuantity === 0;
              // Item existed before with quantity > 0
              const hadPrevious = item.previousQuantity !== undefined && item.previousQuantity > 0;
              // Quantity has changed from a previous non-zero value
              const hasQuantityChanged = hadPrevious && item.quantity !== item.previousQuantity;
              // Item is being removed
              const isRemoved = item.quantity === 0 && hadPrevious;
              // Show as bold (new items, changed quantity, removed items)
              const shouldBold = isTrulyNewItem || wasRemoved || hasQuantityChanged || isRemoved;

              return (
                <tr key={item.id} className={`${isRemoved ? 'removed-item' : ''} ${shouldBold ? 'bold-row' : ''}`}>
                  <td className={isRemoved ? 'strikethrough' : ''}>{item.name}</td>
                  <td className="quantity-cell">
                    {(hasQuantityChanged || isRemoved) && (
                      <span className="old-quantity">{item.previousQuantity}</span>
                    )}
                    <span className={`quantity ${hasQuantityChanged || isRemoved ? 'changed' : ''}`}>
                      {isRemoved ? 'X' : item.quantity}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </main>

      {/* Customer Note */}
      {customerNote && (
        <div className="customer-note">
          {customerNote}
        </div>
      )}

      <style jsx>{`
        .kot-print {
          font-family: monospace;
          color: black;
          background: white;
          padding: 8px;
        }

        .kot-print * {
          color: black !important;
        }

        header {
          text-align: center;
          margin-bottom: 12px;
        }

        .cart-name {
          font-size: 32px;
          font-weight: 900;
          text-align: right;
        }

        .order-ref {
          font-size: 18px;
          font-weight: bold;
        }

        .server-ref {
          font-size: 12px;
          color: #666;
          margin-top: 2px;
        }

        .kot-items {
          width: 100%;
          border-collapse: collapse;
        }

        .kot-items thead td {
          border-bottom: 2px solid black;
          padding-bottom: 4px;
          font-weight: bold;
        }

        .kot-items tbody tr td {
          border-bottom: 2px solid black;
          padding: 8px 0;
          vertical-align: middle;
        }

        .quantity-cell {
          text-align: right;
        }

        .quantity {
          display: inline-block;
          padding: 4px;
          min-width: 1em;
          margin-left: 4px;
        }

        .quantity.changed {
          border: 2px solid black;
          border-radius: 50%;
          min-width: 1.5em;
          text-align: center;
        }

        .old-quantity {
          text-decoration: line-through;
          margin-right: 4px;
          opacity: 0.6;
        }

        .strikethrough {
          text-decoration: line-through;
          opacity: 0.6;
        }

        .removed-item {
          opacity: 0.7;
        }

        .bold-row td {
          font-weight: bold;
        }

        .customer-note {
          margin-top: 16px;
          padding: 8px;
          border: 2px solid black;
        }
      `}</style>
    </div>
  );
}
