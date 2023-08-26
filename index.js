import { chromium } from 'playwright-chromium';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import YAML from 'yaml';

dotenv.config();

const configFile = fs.readFileSync('./config.yml', 'utf8');
const config = YAML.parse(configFile);

if (!config.url || !config.type || !config.town || !config.minutes) {
  console.log('Please make sure to provide valid config file.');
  process.exit(1);
}

if (config.minutes < 1 || config.minutes > 60) {
  console.log('Please make sure to provide a valid amount of minutes in config file.');
  process.exit(1);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(config.url);

  // Accept cookies :/
  const cookiesAcceptButton = await page.getByRole('button', { name: 'Accept all' })

  if (cookiesAcceptButton) {
    console.log("Accepting cookies :/ ");
    await cookiesAcceptButton.click();
  }

  await page.locator('#autocompinp').fill('Potsdam');
  await page.keyboard.press('Enter');

  await page.getByRole('button', { name: '1-Zimmer-Wohnung' }).click();
  await page.getByTitle('Rubrik').selectOption({ textContent: 'WG-Zimmer' });
  await page.getByRole('button', { name: 'WG-Zimmer' }).click();

  await page.getByRole('button', { name: 'Finden' }).click();

  
  //The sort by 'Eintragsdatum' drop-down is very likely to consistently only appear after the first search
  //Still, a bit of a hack. TODO: Improve for more robustness.
  await page.waitForSelector('text=Eintragsdatum');

  let offerDivs = await page.locator('div[data-id]').all();
  let offers = await Promise.all(
    offerDivs.map(async (offer) => {
      const online = await offer.getByText(/Online:/);
      const cost = await offer.getByText(/€/).first(); //heuristic will be wrong sometimes
      const title = await offer.getByRole('heading', { level: 3 });
      const link = await offer.getByRole('link').first();
      
      return {
        online: await online.textContent(),
        cost: await cost.textContent(),
        title: await title.textContent(),
        link: await link.getAttribute('href')
      }
    }));

  offers = offers.filter(offer => offer.online.includes('Minuten'));

  offers.forEach(offer => {
    offer.title = offer.title.replace(/\n/g, ' ').trim();
    offer.link = `${config.url}${offer.link}`;
    offer.minutes = parseInt(offer.online.match(/\d+/)[0]);
  })

  offers = offers.filter(offer => offer.minutes <= config.minutes);

  let messages = offers.map(offer => {
    return `${offer.title} - ${offer.cost} - ${offer.online} - ${offer.link}`;
  });

  const offersCount = offers.length;
  console.log(`Found ${offersCount} new offers.`);

  if (offersCount <= 0) {
    console.log('Exiting as no new offers found.');
    await browser.close();
    process.exit(0);
  }

  const message =
    `In der letzten Stunde wurden die folgenden ${offersCount} neuen WGs ` +
    `eingestellt: \n` +
    messages.join('\n');
  
  console.log('Sending notification.');

  const res = await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token: process.env.PUSHOVER_API_TOKEN,
      user: process.env.PUSHOVER_USER_KEY,
      message,
    }),
  });

  await browser.close();
})();
