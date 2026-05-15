#!/usr/bin/env python3
"""
BuySial Product Scraper — powered by crawl4ai
Reads JSON params from stdin, writes JSON result to stdout.

Params schema:
  { "mode": "search" | "fetch-urls",
    "platform": "noon" | "aliexpress" | "shein" | "amazon",
    "query": "...",
    "page": 1,
    "urls": ["https://..."] }
"""
import asyncio
import json
import re
import sys
from urllib.parse import quote_plus

# ── Platform search URL templates ────────────────────────────────────────────
SEARCH_URLS = {
    "noon":       "https://www.noon.com/saudi-en/search/?q={q}&page={p}",
    "aliexpress": "https://www.aliexpress.com/wholesale?SearchText={q}&page={p}",
    "shein":      "https://www.shein.com/search?q={q}&page={p}",
    "amazon":     "https://www.amazon.sa/s?k={q}&page={p}",
}

# ── CSS extraction schemas per platform ──────────────────────────────────────
SCHEMAS = {
    "noon": {
        "name": "Noon Products",
        "baseSelector": "div[data-qa='product-item'], div[class*='sc-'][class*='product'], article[class*='product']",
        "fields": [
            {"name": "name",     "selector": "div[data-qa='product-name'], h2[class*='name'], span[class*='name']",  "type": "text"},
            {"name": "price",    "selector": "strong[class*='price'], span[class*='price'], div[class*='price']",    "type": "text"},
            {"name": "image",    "selector": "img[data-qa='product-image'], img[class*='image'], img",               "type": "attribute", "attribute": "src"},
            {"name": "link",     "selector": "a[data-qa='product-link'], a[class*='link'], a",                       "type": "attribute", "attribute": "href"},
            {"name": "brand",    "selector": "div[data-qa='product-brand'], span[class*='brand']",                   "type": "text"},
            {"name": "delivery", "selector": "div[data-qa='delivery'], span[class*='delivery']",                     "type": "text"},
        ],
    },
    "aliexpress": {
        "name": "AliExpress Products",
        "baseSelector": "div[class*='search-item-card'], div[class*='list--gallery--'] > div, a[class*='product-title']",
        "fields": [
            {"name": "name",  "selector": "h1[class*='title'], h2[class*='title'], a[class*='title'], span[class*='title']", "type": "text"},
            {"name": "price", "selector": "div[class*='price'] strong, span[class*='price'], div[class*='Sale-Price']",      "type": "text"},
            {"name": "image", "selector": "img[class*='product-image'], img",                                                "type": "attribute", "attribute": "src"},
            {"name": "link",  "selector": "a",                                                                               "type": "attribute", "attribute": "href"},
        ],
    },
    "shein": {
        "name": "Shein Products",
        "baseSelector": "section[class*='S-product-item'], li[class*='product-card'], div[class*='product-item']",
        "fields": [
            {"name": "name",  "selector": "a[class*='goods-title'], p[class*='goods-title'], h2, h3",              "type": "text"},
            {"name": "price", "selector": "div[class*='normal-price'] strong, span[class*='she-price'], strong",   "type": "text"},
            {"name": "image", "selector": "img[class*='crop-image'], img[class*='goods-img'], img",                "type": "attribute", "attribute": "src"},
            {"name": "link",  "selector": "a[class*='goods-title'], a[href*='shein.com']",                         "type": "attribute", "attribute": "href"},
        ],
    },
    "amazon": {
        "name": "Amazon Products",
        "baseSelector": "div[data-component-type='s-search-result']",
        "fields": [
            {"name": "name",   "selector": "h2 a span",                               "type": "text"},
            {"name": "price",  "selector": "span.a-price span.a-offscreen",           "type": "text"},
            {"name": "image",  "selector": "img.s-image",                             "type": "attribute", "attribute": "src"},
            {"name": "link",   "selector": "h2 a",                                    "type": "attribute", "attribute": "href"},
            {"name": "rating", "selector": "span[aria-label*='stars']",               "type": "attribute", "attribute": "aria-label"},
            {"name": "brand",  "selector": "span.a-size-base.a-color-secondary",      "type": "text"},
        ],
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────
def clean(s):
    if not s:
        return ""
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', str(s))).strip()


def parse_price(raw):
    if not raw:
        return 0.0
    nums = re.findall(r'[\d,.]+', str(raw).replace(',', '.'))
    for n in nums:
        try:
            v = float(n.replace(',', '.'))
            if v > 0:
                return round(v, 2)
        except ValueError:
            continue
    return 0.0


def extract_jsonld(html):
    products = []
    for m in re.finditer(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>', html, re.I):
        try:
            obj = json.loads(m.group(1))
        except Exception:
            continue
        items = obj if isinstance(obj, list) else [obj]
        for item in items:
            graph = item.get('@graph', []) if isinstance(item, dict) else []
            candidates = [item] + graph
            for c in candidates:
                if isinstance(c, dict) and c.get('@type') == 'Product':
                    products.append(c)
    return products


def jsonld_to_product(p, source_url=""):
    offer = p.get('offers') or {}
    if isinstance(offer, list):
        offer = offer[0] if offer else {}
    imgs = p.get('image', [])
    if isinstance(imgs, str):
        imgs = [imgs]
    price_raw = offer.get('price', 0)
    return {
        "name":        clean(p.get('name', '')),
        "description": clean(p.get('description', '')),
        "images":      [i for i in imgs if i and str(i).startswith('http')][:8],
        "price":       parse_price(price_raw),
        "currency":    offer.get('priceCurrency', 'SAR'),
        "stock":       100 if 'InStock' in str(offer.get('availability', '')) else 0,
        "sku":         p.get('sku') or p.get('mpn') or '',
        "brand":       clean(p.get('brand', {}).get('name', '') if isinstance(p.get('brand'), dict) else p.get('brand', '')),
        "category":    clean(p.get('category', '')),
        "sourceUrl":   source_url,
        "platform":    "url",
    }


def extract_og(html):
    def get(*keys):
        for key in keys:
            # Matches og:KEY or product:KEY or just KEY in property attribute
            for prefix in ('og:', 'product:', ''):
                m = re.search(rf'<meta[^>]*property=["\'][^"\']{{0,30}}{re.escape(prefix + key)}["\'][^>]*content=["\']([^"\']*)', html, re.I) \
                    or re.search(rf'<meta[^>]*content=["\']([^"\']*)["\'][^>]*property=["\'][^"\']{{0,30}}{re.escape(prefix + key)}["\']', html, re.I)
                if m and m.group(1).strip():
                    return m.group(1).strip()
        return None
    return {
        "title":       get('title'),
        "description": get('description'),
        "image":       get('image'),
        "price":       get('price:amount', 'price'),
        "currency":    get('price:currency'),
    }


def extract_microdata(html):
    """Extract Schema.org microdata itemprop attributes."""
    def get_attr(prop):
        m = re.search(rf'itemprop=["\'{prop}"\'\s][^>]*content=["\']([^"\']*)', html, re.I) \
            or re.search(rf'itemprop=["\'{prop}"\'\s][^>]*>[\s]*([^<]{{1,200}})', html, re.I)
        return m.group(1).strip() if m else None
    def get_src(prop):
        m = re.search(rf'itemprop=["\'{prop}"\'\s][^>]*src=["\']([^"\']*)', html, re.I)
        return m.group(1).strip() if m else None
    return {
        "name":     get_attr('name'),
        "price":    get_attr('price'),
        "currency": get_attr('priceCurrency'),
        "image":    get_src('image') or get_attr('image'),
        "description": get_attr('description'),
        "sku":      get_attr('sku') or get_attr('mpn'),
        "brand":    get_attr('brand'),
    }


def normalize_search_item(raw, platform, base_url=""):
    name  = clean(raw.get('name', ''))
    price = parse_price(raw.get('price', ''))
    img   = raw.get('image', '')
    link  = raw.get('link', '') or raw.get('href', '')
    if img and img.startswith('//'):
        img = 'https:' + img
    if link and not link.startswith('http'):
        link = base_url.rstrip('/') + '/' + link.lstrip('/')
    return {
        "name":         name,
        "price":        price,
        "originalPrice": parse_price(raw.get('original_price', 0)),
        "images":       [img] if img else [],
        "currency":     "SAR",
        "brand":        clean(raw.get('brand', '')),
        "delivery":     clean(raw.get('delivery', '')),
        "description":  name,
        "category":     clean(raw.get('category', '')),
        "stock":        100,
        "sourceUrl":    link,
        "sku":          clean(raw.get('sku', '')),
        "platform":     platform,
    }


# ── crawl4ai API (supports both old <0.4 and new >=0.4) ──────────────────────
async def make_crawler():
    try:
        from crawl4ai import AsyncWebCrawler, BrowserConfig
        bc = BrowserConfig(
            headless=True,
            verbose=False,
            extra_args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        )
        return AsyncWebCrawler(config=bc), "new"
    except (ImportError, TypeError):
        from crawl4ai import AsyncWebCrawler
        return AsyncWebCrawler(headless=True, verbose=False), "old"


async def arun(crawler, url, strategy=None, api="new"):
    try:
        if api == "new":
            from crawl4ai import CrawlerRunConfig, CacheMode
            cfg = CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                extraction_strategy=strategy,
                wait_for="body",
                page_timeout=30000,
            )
            return await crawler.arun(url=url, config=cfg)
        else:
            kwargs = {"bypass_cache": True}
            if strategy:
                kwargs["extraction_strategy"] = strategy
            return await crawler.arun(url=url, **kwargs)
    except Exception:
        # Final fallback — try without strategy
        return await crawler.arun(url=url)


# ── Search mode ───────────────────────────────────────────────────────────────
async def do_search(platform, query, page):
    from crawl4ai.extraction_strategy import JsonCssExtractionStrategy

    url_tpl = SEARCH_URLS.get(platform)
    if not url_tpl:
        return {"products": [], "error": f"Unsupported platform: {platform}"}

    url = url_tpl.format(q=quote_plus(query), p=page)
    schema = SCHEMAS.get(platform)

    crawler, api = await make_crawler()
    async with crawler:
        strategy = JsonCssExtractionStrategy(schema, verbose=False) if schema else None
        try:
            result = await arun(crawler, url, strategy=strategy, api=api)
        except Exception as e:
            return {"products": [], "error": str(e), "warning": f"Crawl failed: {e}"}

        # Try structured extraction first
        products = []
        if result.extracted_content:
            try:
                raw_items = json.loads(result.extracted_content)
                if isinstance(raw_items, list):
                    products = [normalize_search_item(r, platform, url) for r in raw_items if r.get('name')]
            except Exception:
                pass

        # Fallback: parse __NEXT_DATA__ (works for Noon / other Next.js stores)
        if not products and result.html:
            m = re.search(r'<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)</script>', result.html)
            if m:
                try:
                    nd = json.loads(m.group(1))
                    hits = (
                        nd.get('props', {}).get('pageProps', {}).get('hits') or
                        nd.get('props', {}).get('pageProps', {}).get('initialData', {}).get('hits') or
                        nd.get('props', {}).get('pageProps', {}).get('catalogPageData', {}).get('hits') or []
                    )
                    for h in hits[:24]:
                        ik = (h.get('image_keys') or [''])[0]
                        img = f"https://f.nooncdn.com/p/{ik}_A26.jpg" if ik else (h.get('thumbnail') or '')
                        products.append({
                            "name":          clean(h.get('name') or h.get('title') or ''),
                            "price":         parse_price(h.get('price', {}).get('raw') if isinstance(h.get('price'), dict) else h.get('price')),
                            "originalPrice": parse_price(h.get('was_price', {}).get('raw') if isinstance(h.get('was_price'), dict) else 0),
                            "images":        [img] if img else [],
                            "currency":      "SAR",
                            "brand":         clean(h.get('brand_name') or ''),
                            "delivery":      clean(h.get('delivery_text') or ''),
                            "description":   clean(h.get('name') or ''),
                            "category":      '',
                            "stock":         h.get('qty_for_shipping', 100),
                            "sourceUrl":     f"https://www.noon.com/saudi-en/{h.get('sku', '')}/p/" if h.get('sku') else '',
                            "sku":           h.get('sku', ''),
                            "platform":      "noon",
                        })
                except Exception:
                    pass

        # Fallback: JSON-LD products on page
        if not products and result.html:
            for ld in extract_jsonld(result.html):
                p = jsonld_to_product(ld, url)
                if p['name']:
                    p['platform'] = platform
                    products.append(p)

        warning = None
        if not products:
            warning = f"No products found on {platform}. Try different keywords or use URL Import."

        return {"products": products, "hasMore": len(products) >= 20, "warning": warning, "platform": platform}


# ── URL fetch mode ────────────────────────────────────────────────────────────
async def do_fetch_urls(urls):
    crawler, api = await make_crawler()
    results = []

    async with crawler:
        for url in urls[:20]:
            url = str(url).strip()
            if not url.startswith('http'):
                results.append({"url": url, "success": False, "error": "Invalid URL"})
                continue
            try:
                result = await arun(crawler, url, api=api)
                html = result.html or ''

                product = None
                # 1. JSON-LD
                lds = extract_jsonld(html)
                if lds:
                    product = jsonld_to_product(lds[0], url)

                # 2. Open Graph + microdata fallback
                og = extract_og(html)
                micro = extract_microdata(html)
                if not product or not product.get('name'):
                    raw_title = og.get('title') or micro.get('name') or ''
                    product = {
                        "name":        raw_title.split('|')[0].split(' - ')[0].strip(),
                        "description": og.get('description') or micro.get('description') or '',
                        "images":      [og['image']] if og.get('image') else ([micro['image']] if micro.get('image') else []),
                        "price":       parse_price(og.get('price') or micro.get('price') or 0),
                        "currency":    og.get('currency') or micro.get('currency') or 'SAR',
                        "stock":       100,
                        "sku":         micro.get('sku') or '',
                        "brand":       micro.get('brand') or '',
                        "category":    '',
                        "sourceUrl":   url,
                        "platform":    "url",
                    }
                else:
                    # Patch missing fields from OG / microdata
                    if not product.get('price') or product['price'] == 0:
                        product['price'] = parse_price(og.get('price') or micro.get('price') or 0)
                    if not product.get('images'):
                        if og.get('image'):   product['images'] = [og['image']]
                        elif micro.get('image'): product['images'] = [micro['image']]
                    if not product.get('currency') or product['currency'] == 'SAR':
                        product['currency'] = og.get('currency') or micro.get('currency') or 'SAR'

                # 3. <title> tag fallback for name
                if not product.get('name'):
                    m = re.search(r'<title[^>]*>([\s\S]*?)</title>', html, re.I)
                    if m:
                        product['name'] = clean(m.group(1)).split('|')[0].split(' - ')[0].strip()

                # Use crawl4ai's clean markdown for description if empty
                if not product.get('description') and result.markdown:
                    lines = [l.strip() for l in result.markdown.splitlines() if l.strip()]
                    product['description'] = ' '.join(lines[:5])[:500]

                if product.get('name'):
                    results.append({"url": url, "success": True, "product": product})
                else:
                    results.append({"url": url, "success": False, "error": "Could not extract product data"})

            except Exception as e:
                results.append({"url": url, "success": False, "error": str(e)})

    return {"results": results}


# ── Entry point ───────────────────────────────────────────────────────────────
async def main():
    try:
        raw = sys.stdin.read()
        params = json.loads(raw)
    except Exception as e:
        print(json.dumps({"error": f"Invalid params: {e}"}))
        sys.exit(1)

    mode = params.get("mode", "search")

    try:
        if mode == "search":
            out = await do_search(
                platform=params.get("platform", "noon"),
                query=params.get("query", ""),
                page=int(params.get("page", 1)),
            )
        elif mode == "fetch-urls":
            out = await do_fetch_urls(urls=params.get("urls", []))
        else:
            out = {"error": f"Unknown mode: {mode}"}
    except Exception as e:
        out = {"error": str(e)}

    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
