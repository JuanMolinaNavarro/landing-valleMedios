import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { existsSync } from 'fs';
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

    const executablePath = this.resolveExecutablePath();
    const launchArgs = this.env.puppeteerNoSandbox
      ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      : ['--disable-dev-shm-usage'];

    this.browserPromise = puppeteer
      .launch({
        headless: true,
        executablePath,
        args: launchArgs,
      })
      .then((browser) => {
        this.browser = browser;
        this.logger.log(
          `Puppeteer browser started${executablePath ? ` (${executablePath})` : ' (bundled)'}`,
        );
        return browser;
      })
      .catch((error: unknown) => {
        this.browserPromise = null;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Puppeteer launch error: ${message}`);
        throw error;
      });

    return this.browserPromise;
  }

  private resolveExecutablePath(): string | undefined {
    if (this.env.puppeteerExecutablePath) {
      return this.env.puppeteerExecutablePath;
    }

    const candidates = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ];

    return candidates.find((path) => existsSync(path));
  }
}
