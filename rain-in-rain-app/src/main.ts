export {};
// The complete V3 remains available while V4 is validated incrementally.
const loading = new URLSearchParams(location.search).get('version') === '3'
  ? import('./legacy-main')
  : import('./prototype/main');
loading.catch(error => {
  const message = document.createElement('p');
  message.setAttribute('role', 'alert');
  message.textContent = '页面未能载入，请刷新后重试。' + String(error);
  document.querySelector('#app')!.append(message);
});
