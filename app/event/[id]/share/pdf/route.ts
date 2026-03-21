import { type NextRequest, NextResponse } from "next/server";
import { getEvent } from "@/lib/actions/events";

export const maxDuration = 60; // seconds — PDF generation needs time on Vercel

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate event exists
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Build the URL to render
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/event/${id}/share?print=1`;

  let browser;
  try {
    if (process.env.NODE_ENV === "production") {
      const chromium = await import("@sparticuz/chromium-min");
      const puppeteerCore = await import("puppeteer-core");
      browser = await puppeteerCore.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar"
        ),
        headless: true,
      });
    } else {
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    // Inject print-mode class + force light theme tokens
    await page.evaluate(() => {
      document.documentElement.classList.add("print-mode");
    });
    await page.addStyleTag({
      content: `
        html {
          --bg: #ffffff !important;
          --bg-surface: #f5f5f5 !important;
          --bg-raised: #eeeeee !important;
          --bg-hover: #e0e0e0 !important;
          --border: #cccccc !important;
          --border-muted: #dddddd !important;
          --text: #111111 !important;
          --text-muted: #555555 !important;
          --text-dim: #888888 !important;
          --color-bg: #ffffff !important;
          --color-surface: #f5f5f5 !important;
          --color-raised: #eeeeee !important;
          --color-hover: #e0e0e0 !important;
          --color-border: #cccccc !important;
          --color-text: #111111 !important;
          --color-muted: #555555 !important;
          --color-dim: #888888 !important;
          background: #ffffff !important;
          color: #111111 !important;
        }
        body { background: #ffffff !important; color: #111111 !important; }
      `,
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });

    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rider-${event.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: String(err) },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}
