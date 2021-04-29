const express = require('express');
const puppeteer = require('puppeteer');
//const ssr = require('./ssr.js');
const app = express();
const RENDER_CACHE = new Map();
const port = process.env.PORT || 1457

app.get('/', async function(req, res){
  //res.send('url: ' + req.query.url);
  

  if(req.query.url!= undefined){
      const myURL = new URL(req.query.url);
      const {html, ttRenderMs } = await ssr(myURL);
      res.set('Server-Timing', `Prerender;dur=${ttRenderMs};desc="Headless render time (ms)"`);
      return res.status(200).send(html);
  }else{
      return res.send('url: ' + req.query.url);
  }
});

async function ssr(myURL) {
  url = myURL.href;

  if (RENDER_CACHE.has(url)) {
    return {html: RENDER_CACHE.get(url), ttRenderMs: 0};
  }

  const start = Date.now();

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  var status;
  try {
    // networkidle0 waits for the network to be idle (no requests for 500ms).
    // The page's JS has likely produced markup by this point, but wait longer
    // if your site lazy loads, etc.
    const response = await page.goto(url, {waitUntil: 'networkidle2',timeout: 0});
    //await page.waitForSelector('#posts'); // ensure #posts exists in the DOM.
  } catch (err) {
    console.error(err);
    throw new Error('page.goto/waitForSelector timed out.');
  }

  var html = await page.content(); // serialized HTML of page DOM.

  html = html.replace( '<head>', '<head><base href="'+myURL.origin+'">');
  html = html.replace( '<noscript>You need to enable JavaScript to run this app.</noscript>', '');
  await browser.close();

  const ttRenderMs = Date.now() - start;
  console.info(`Headless rendered page in: ${ttRenderMs}ms`);

  RENDER_CACHE.set(url, html); // cache rendered page.

  return {html, ttRenderMs};
}

const server = app.listen(port, () => console.log('Server started. Press Ctrl+C to quit'));

server.keepAliveTimeout = 76 * 1000;
server.headersTimeout = 77 * 1000;