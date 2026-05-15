#!/usr/bin/env python3
"""
BuySial Product Scraper — powered by crawl4ai + direct API fallbacks
Reads JSON params from stdin, writes JSON result to stdout.
"""
import asyncio
import json
import re
import sys
import urllib.request
from urllib.parse import quote_plus

# ── Platform search URL templates ────────────────────────────────────────────
SEARCH_URLS = {
    "noon":       "https://www.noon.com/saudi-en/search/?q={q}&page={p}",
    "aliexpress": "https://www.aliexpress.com/wholesale?SearchText={q}&page={p}",
    "shein":      "https://ar.shein.com/search?q={q}&page={p}",
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
    nums = re.findall(r'\d+(?:[.,]\d+)?', str(raw).replace(',', '.'))
    for n in nums:
        try:
            v = float(n.replace(',', '.'))
            if v > 0:
                return round(v, 2)
        except ValueError:
            continue
    return 0.0


def extract_images_from_html(html, max_imgs=8):
    """Scrape all product-looking images from raw HTML."""
    imgs = []
    seen = set()
    for m in re.finditer(
        r'<img[^>]+(?:src|data-src|data-original|data-lazy-src)=["\']([^"\']+\.(?:jpg|jpeg|png|webp)[^"\']*)["\']',
        html, re.I
    ):
        u = m.group(1).split('?')[0]
        if u.startswith('//'):
            u = 'https:' + u
        if (u.startswith('http') and u not in seen
                and 'icon' not in u.lower() and 'logo' not in u.lower()
                and 'avatar' not in u.lower() and 'sprite' not in u.lower()):
            seen.add(u)
            imgs.append(u)
            if len(imgs) >= max_imgs:
                break
    return imgs


def extract_delivery(html):
    """Extract first delivery/shipping text snippet from page."""
    patterns = [
        r'((?:Free|Express|Standard|Next.Day|Same.Day)\s+(?:delivery|shipping)[^<.\n]{0,80})',
        r'(Delivered\s+(?:by|in|within)\s+[^<.\n]{0,60})',
        r'(Ships?\s+(?:in|within|by)\s+[^<.\n]{0,60})',
        r'((?:delivery|shipping)\s+(?:within|in|by)\s+[^<.\n]{0,60})',
        r'((?:التوصيل|الشحن)[^<.\n]{0,80})',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I)
        if m:
            return clean(m.group(1))
    return ''


# ── Direct REST API (no Playwright) ──────────────────────────────────────────
def fetch_json_api(url, headers=None, timeout=12):
    h = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def search_noon_api(query, page=1):
    """Call Noon's internal JSON catalog API — no Playwright needed."""
    try:
        data = fetch_json_api(
            f"https://www.noon.com/_svc/catalog/api/v3/u/search/?q={quote_plus(query)}&limit=20&start={(page-1)*20}&lang=en&country=SAU",
            headers={'x-country': 'SAU', 'x-language': 'en', 'x-platform': 'web'},
        )
        hits = data.get('data', {}).get('hits') or data.get('hits') or []
        products = []
        for item in hits:
            imgs = [
                f"https://f.nooncdn.com/p/{k}/n/com/1000/A01.jpg"
                for k in (item.get('image_keys') or [])
            ]
            if not imgs and item.get('thumbnail'):
                imgs = [item['thumbnail']]

            pi = item.get('price') or {}
            if isinstance(pi, (int, float, str)):
                price_now, price_was = parse_price(pi), 0.0
            else:
                price_now = parse_price(pi.get('now') or pi.get('sale_price') or 0)
                price_was = parse_price(pi.get('was') or pi.get('old') or 0)

            di = item.get('delivery') or {}
            delivery = di.get('label', '') if isinstance(di, dict) else str(di)

            name = item.get('name') or item.get('title') or ''
            if not name:
                continue
            sku = item.get('sku') or item.get('id') or ''
            products.append({
                'name': name,
                'price': price_now,
                'originalPrice': price_was,
                'images': imgs[:8],
                'currency': 'SAR',
                'brand': item.get('brand') or '',
                'category': item.get('category_name') or '',
                'delivery': delivery,
                'stock': 100,
                'description': '',
                'sourceUrl': f"https://www.noon.com/product/{sku}" if sku else '',
                'sku': sku,
                'platform': 'noon',
            })
        return products
    except Exception:
        return []  # silent fail → fall through to crawl4ai


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
    if not isinstance(p, dict):
        return None
    ptype = str(p.get('@type', ''))
    if 'Product' not in ptype and 'product' not in ptype:
        return None
    # Images — can be string, list of strings, or list of ImageObjects
    imgs_raw = p.get('image', [])
    if isinstance(imgs_raw, str):
        imgs_raw = [imgs_raw]
    elif isinstance(imgs_raw, dict):
        imgs_raw = [imgs_raw.get('url') or imgs_raw.get('contentUrl') or '']
    out_imgs = []
    for i in imgs_raw:
        if isinstance(i, dict):
            i = i.get('url') or i.get('contentUrl') or ''
        if i and str(i).startswith('http'):
            out_imgs.append(str(i))

    offer = p.get('offers') or {}
    if isinstance(offer, list):
        offer = offer[0] if offer else {}
    if not isinstance(offer, dict):
        offer = {}
    price_raw = offer.get('price') or offer.get('lowPrice') or 0

    return {
        "name":        clean(p.get('name', '')),
        "description": clean(p.get('description', '')),
        "images":      out_imgs[:8],
        "price":       parse_price(price_raw),
        "currency":    offer.get('priceCurrency', 'SAR'),
        "stock":       100 if 'InStock' in str(offer.get('availability', '')) else 50,
        "sku":         p.get('sku') or p.get('mpn') or '',
        "brand":       clean(p.get('brand', {}).get('name', '') if isinstance(p.get('brand'), dict) else p.get('brand', '')),
        "category":    clean(p.get('category', '')),
        "delivery":    '',
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
    # Noon: hit internal JSON REST API first — no Playwright, no timeouts
    if platform == "noon":
        products = search_noon_api(query, page)
        if products:
            return {"products": products, "hasMore": len(products) >= 20, "warning": None, "platform": "noon"}

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
            return {"products": [], "warning": f"Search unavailable for {platform}. Try URL Import tab.", "platform": platform}

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


# ── Shein-specific extractor ─────────────────────────────────────────────────
def extract_shein_product(html, url):
    """Parse Shein's embedded JS product data (window.gbData / PRELOADED_STATE)."""
    # Try to find product goods_id from URL
    gid_m = re.search(r'-p-(\d+)\.html', url)
    goods_id = gid_m.group(1) if gid_m else None

    # Try window.gbData.product or similar inline objects
    for pat in (
        r'window\.gbData\s*=\s*(\{[\s\S]{50,200000}?\})\s*;?\s*(?:window|var|let|const|$)',
        r'"product"\s*:\s*(\{[^{}]{0,5000}(?:\{[^{}]*\}[^{}]{0,5000})*\})',
        r'SH_PAGE_CONTEXT\s*=\s*(\{[\s\S]{20,100000}?\})\s*;',
    ):
        m = re.search(pat, html)
        if not m:
            continue
        try:
            data = json.loads(m.group(1))
        except Exception:
            continue

        # Walk known paths
        prod = (
            data.get('product') or
            data.get('goods_info') or
            data.get('detail') or
            data
        )
        if not isinstance(prod, dict):
            continue

        name = clean(prod.get('goods_name') or prod.get('name') or prod.get('goodsName') or '')
        if not name or len(name) < 5:
            continue

        # Price
        price_raw = (
            prod.get('salePrice', {}).get('amount') or
            prod.get('retailPrice', {}).get('amount') or
            prod.get('price') or
            prod.get('salePrice') or
            0
        )
        currency = (
            prod.get('salePrice', {}).get('currency') or
            prod.get('currency') or 'SAR'
        )

        # Images
        imgs = []
        img_list = prod.get('images') or prod.get('goods_imgs') or prod.get('detail_image') or []
        if isinstance(img_list, list):
            for im in img_list[:8]:
                u = im if isinstance(im, str) else (im.get('src') or im.get('url') or im.get('image_url') or '')
                if u and not u.startswith('http'):
                    u = 'https:' + u
                if u.startswith('http'):
                    imgs.append(u)
        main_img = prod.get('goods_img') or prod.get('main_image') or ''
        if main_img and not main_img.startswith('http'):
            main_img = 'https:' + main_img
        if main_img and main_img not in imgs:
            imgs.insert(0, main_img)

        return {
            "name":        name,
            "description": clean(prod.get('goods_desc') or prod.get('description') or ''),
            "images":      imgs[:8],
            "price":       parse_price(price_raw),
            "currency":    currency,
            "stock":       100,
            "delivery":    '',
            "sku":         str(prod.get('goods_sn') or prod.get('sku') or goods_id or ''),
            "brand":       '',
            "category":    clean(prod.get('cat_name') or ''),
            "sourceUrl":   url,
            "platform":    "shein",
        }

    return None  # fallback to JSON-LD / OG


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

                # 0. Shein-specific: parse window.gbData / __PRELOADED_STATE__
                if 'shein.com' in url:
                    product = extract_shein_product(html, url)

                # 1. JSON-LD — most reliable when present
                if not product:
                    for ld in extract_jsonld(html):
                        p = jsonld_to_product(ld, url)
                        if p and p.get('name'):
                            product = p
                            break

                # 2. OG + microdata
                og    = extract_og(html)
                micro = extract_microdata(html)

                if not product or not product.get('name'):
                    raw_title = og.get('title') or micro.get('name') or ''
                    product = {
                        "name":        raw_title.split('|')[0].split(' - ')[0].strip(),
                        "description": og.get('description') or micro.get('description') or '',
                        "images":      ([og['image']] if og.get('image') else
                                        ([micro['image']] if micro.get('image') else [])),
                        "price":       parse_price(og.get('price') or micro.get('price') or 0),
                        "currency":    og.get('currency') or micro.get('currency') or 'SAR',
                        "stock":       100,
                        "delivery":    '',
                        "sku":         micro.get('sku') or '',
                        "brand":       micro.get('brand') or '',
                        "category":    '',
                        "sourceUrl":   url,
                        "platform":    "url",
                    }
                else:
                    # Patch zero/missing fields
                    if not product.get('price'):
                        product['price'] = parse_price(og.get('price') or micro.get('price') or 0)
                    if not product.get('images'):
                        if og.get('image'):      product['images'] = [og['image']]
                        elif micro.get('image'): product['images'] = [micro['image']]
                    if not product.get('currency'):
                        product['currency'] = og.get('currency') or micro.get('currency') or 'SAR'

                # 3. Supplement images from raw HTML (get up to 8 total)
                if len(product.get('images', [])) < 8:
                    extra = extract_images_from_html(html, max_imgs=8)
                    seen  = set(product.get('images', []))
                    for img in extra:
                        if img not in seen:
                            product.setdefault('images', []).append(img)
                            seen.add(img)
                            if len(product['images']) >= 8:
                                break

                # 4. Delivery info
                if not product.get('delivery'):
                    product['delivery'] = extract_delivery(html)

                # 5. Title fallback for name
                if not product.get('name'):
                    m = re.search(r'<title[^>]*>([\s\S]*?)</title>', html, re.I)
                    if m:
                        product['name'] = clean(m.group(1)).split('|')[0].split(' - ')[0].strip()

                # 6. Description from markdown (longer, cleaner than raw HTML)
                if not product.get('description') and result.markdown:
                    lines = [l.strip() for l in result.markdown.splitlines()
                             if l.strip() and len(l.strip()) > 30]
                    product['description'] = ' '.join(lines[:8])[:1000]

                product['sourceUrl'] = url
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
