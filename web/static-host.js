// scripts/build-static.mjs marks its pages data-host="static": plain files on an
// ordinary web server, with no PixlPrfct server behind them. Accounts, cloud files
// and team libraries need that server, so these pages leave them out.
export const staticHost=document.documentElement.dataset.host==='static';
