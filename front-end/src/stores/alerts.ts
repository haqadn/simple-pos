import { defineStore } from "pinia";

export const useAlertsStore = defineStore("alerts", {
  state: () => ({
    alert: {
      visible: false,
      message: <string | null>null,
      cancel: () => {
        /* noop */
      },
    },
    confirm: {
      visible: false,
      message: <string | null>null,
      callback: () => {
        /* noop */
      },
      cancel: () => {
        /* noop */
      },
    },
  }),
  actions: {
    dismissAlert() {
      this.alert.cancel();
      this.setAlertDismiss(() => {
        /* noop */
      });
      this.alert.visible = false;
    },
    dismissConfirm() {
      this.confirm.cancel();
      this.setConfirmDismiss(() => {
        /* noop */
      });
      this.confirm.visible = false;
    },
    callbackConfirm() {
      this.confirm.callback();
      this.setConfirmCallback(() => {
        /* noop */
      });
      this.confirm.visible = false;
    },
    setAlertDismiss(callback: () => void) {
      this.alert.cancel = callback;
    },
    setConfirmCallback(callback: () => void) {
      this.confirm.callback = callback;
    },
    setConfirmDismiss(callback: () => void) {
      this.confirm.cancel = callback;
    },
  },
});

export function alertAsync(message: string) {
  const store = useAlertsStore();
  store.alert.message = message;
  store.alert.visible = true;

  return new Promise((resolve) => {
    store.setAlertDismiss(() => {
      resolve(true);
    });
  });
}

export function confirmAsync(message: string) : Promise<boolean> {
  const store = useAlertsStore();
  store.confirm.message = message;
  store.confirm.visible = true;

  return new Promise((resolve) => {
    store.setConfirmCallback(() => {
      resolve(true);
    });
    store.setConfirmDismiss(() => {
      resolve(false);
    });
  });
}
