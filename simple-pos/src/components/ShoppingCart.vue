<template>
  <v-card
    class="mx-auto"
    max-width="600"
  >
    <v-toolbar color="secondary">
      <v-toolbar-title>Shopping Cart</v-toolbar-title>
    </v-toolbar>

    <v-list lines="two">
        <v-list-item
            v-for="(item, i) in items"
            :key="item.id"
            :title="item.name"
            :subtitle="formatCurrency( item.price ) + 'x' + item.quantity"
        >
            <template v-slot:prepend>
                <v-avatar color="grey-lighten-1">{{ i + 1 }}</v-avatar>
            </template>
        
            <template v-slot:append>
                {{ formatCurrency( item.price * item.quantity ) }}
            </template>
        </v-list-item>
    </v-list>
    <v-divider></v-divider>
    <v-list lines="two">
        <v-list-item
            v-if="discount.amount > 0"
            title="Discount"
            :subtitle="formatDiscount( discount.value )"
        >
            <template v-slot:append>
                {{ formatCurrency( totalDiscount ) }}
            </template>
        </v-list-item>
        <v-list-item
            v-if="coupon.amount > 0"
            title="Coupon"
            :subtitle="coupon.name"
        >
            <template v-slot:append>
                {{ formatCurrency( couponDiscount ) }}
            </template>
        </v-list-item>
        <v-list-item
            title="Total"
        >
            <template v-slot:append>
                <strong>{{ formatCurrency( total ) }}</strong>
            </template>
        </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
import { mapState, mapActions } from 'pinia'
import { useCartStore } from '../stores/cart'

  export default {
    data: () => ({
        currency: '৳',
        discount: {
            type: 'percent',
            value: 10,
        },
        coupon: {
            name: 'FOO',
            type: 'percent',
            amount: 10,
        }
    }),
    computed: {
        ...mapState(useCartStore, ['items']),

        subtotal() {
            return Object.values(this.items).reduce((total, item) => {
                return total + (item.price * item.quantity);
            }, 0);
        },
        totalDiscount() {
            if (this.discount.type === 'percent') {
                return this.subtotal * (this.discount.value / 100);
            } else {
                return this.discount.value;
            }
        },
        couponDiscount() {
            if (this.coupon.type === 'percent') {
                return this.subtotal * (this.coupon.amount / 100);
            } else {
                return this.coupon.amount;
            }
        },
        total() {
            return this.subtotal - this.totalDiscount - this.couponDiscount;
        }
    },
    methods: {
        formatDiscount( amount ) {
            if (this.discount.type === 'percent') {
                return amount + '%';
            } else {
                return this.currency + amount;
            }
        },
        formatCurrency( amount ) {
            return this.currency + amount.toFixed(2);
        }
    }
  }
</script>