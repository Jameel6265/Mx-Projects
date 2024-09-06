import { chromium } from "playwright";
import * as readline from 'readline';
import * as fs from 'fs';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (question: string): Promise<string> => {
    return new Promise(resolve => rl.question(question, resolve));
}

const savePageSource = async (page: any, fileName: string) => {
    const content = await page.content();
    fs.writeFileSync(fileName, content, 'utf8');
    console.log(`Page source saved to ${fileName}`);
}

const scrapeWebsite = async (mail_id: string, password: string) => {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: false });
    
    const context = await browser.newContext({
        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata'
    });
    const page = await context.newPage();

    console.log('Navigating to the login page...');
    await page.goto('https://www.amazon.in/?ref_=icp_country_from_us');
    await page.waitForTimeout(10000);

    await page.goto('https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.in%2F%3Fref_%3Dnav_ya_signin&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=inflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0')
    console.log('Filling in the mail ID...');
    await page.locator('//*[@id="ap_email"]').fill(mail_id);

    await page.locator('input#continue').click();

    await page.waitForTimeout(10000);

    console.log('Filling in the Password...');
    await page.locator('//*[@id="ap_password"]').fill(password);
    await page.locator('input#signInSubmit').click();

    await page.waitForTimeout(10000);

    console.log('Navigating to order history...');
    await page.goto('https://www.amazon.in/gp/your-account/order-history?ref_=ya_d_c_yo');
    await savePageSource(page, 'order-history.html');

   
    await page.waitForSelector('div.order-card.js-order-card');

    const products = await page.evaluate(() => {
        const productElements = document.querySelectorAll('div.order-card.js-order-card'); 
        const productArray: Array<{ title: string, price: string, link: string }> = [];
        
        productElements.forEach(productElement => {
          const titleElement = productElement.querySelector('.yohtmlc-product-title');
          const priceElement = productElement.querySelector('div.a-column.a-span2 > div.a-row > span.a-size-base.a-color-secondary');
          const linkElement = productElement.querySelector('a.a-link-normal[href*="/dp/"]');
          
          const title = titleElement?.textContent?.trim() || 'No title found';
          const price = priceElement?.textContent?.trim() || 'No price found';
          const link = linkElement ? `https://www.amazon.in${linkElement.getAttribute('href')}` : 'No link found';
          
          productArray.push({ 
            title, 
            price, 
            link 
          });
        });
        return productArray;
    });

    console.log('Extracted Products:', products);
    fs.writeFileSync('products.json', JSON.stringify(products, null, 2));

    console.log('Products data has been written to products.json');

    console.log('Closing browser...');
    await browser.close();
}

const main = async () => {
    const mail_id = await askQuestion('Enter Registered Mail Id or Phone Number: ');
    const password = await askQuestion('Enter password: ');
    rl.close();
    console.log(`Mail Id entered: ${mail_id}`);
    console.log(`Password entered: ${password}`);
    await scrapeWebsite(mail_id, password);
}


main();
