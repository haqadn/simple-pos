export function debounce(callback: () => void, wait: number) {
  let timeout: number | undefined;

  return () => {
    const later = function () {
      timeout = undefined;
      callback();
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
