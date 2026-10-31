const dialog = document.querySelector('.lightbox');
let sourceLink;
for (const link of document.querySelectorAll('[data-lightbox]')) {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    sourceLink = link;
    const image = dialog.querySelector('img');
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    dialog.querySelector('p').textContent = link.dataset.caption;
    dialog.showModal();
  });
}
dialog.querySelector('button').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => sourceLink?.focus());
