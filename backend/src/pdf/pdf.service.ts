import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

import { loadEnv } from '../config/env';

@Injectable()
export class PdfService implements OnModuleDestroy {
  private readonly env = loadEnv();
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;
  private browserPromise: Promise<Browser> | null = null;

  async renderPdfFromHtml(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.browser) {
      return;
    }

    await this.browser.close();
    this.browser = null;
    this.browserPromise = null;
    this.logger.log('Puppeteer browser closed');
  }

  private async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.browserPromise) {
      return this.browserPromise;
    }

    this.browserPromise = puppeteer
      .launch({
        headless: true,
        executablePath: this.env.puppeteerExecutablePath,
        args: this.env.puppeteerNoSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      })
      .then((browser) => {
        this.browser = browser;
        return browser;
      });

    return this.browserPromise;
  }
}
