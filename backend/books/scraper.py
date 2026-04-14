"""
Scraper for https://books.toscrape.com
Uses Selenium for page navigation and BeautifulSoup for parsing.

Usage (standalone test):
    python scraper.py

Usage (from Django):
    from books.scraper import scrape_books
    results = scrape_books(max_pages=5)
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

BASE_URL = "https://books.toscrape.com"
CATALOGUE_URL = f"{BASE_URL}/catalogue"

# Map word ratings to numbers
RATING_MAP = {
    "One": 1.0,
    "Two": 2.0,
    "Three": 3.0,
    "Four": 4.0,
    "Five": 5.0,
}


@dataclass
class ScrapedBook:
    title: str
    book_url: str
    cover_image_url: str
    rating: Optional[float]
    price: Optional[float]
    availability: str
    description: str = ""
    genre: str = ""
    author: str = ""
    num_reviews: int = 0


def _get_soup(url: str, retries: int = 3) -> Optional[BeautifulSoup]:
    """Fetch a URL with retries and return a BeautifulSoup object."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            return BeautifulSoup(response.text, "html.parser")
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1}/{retries} failed for {url}: {e}")
            time.sleep(2 ** attempt)  # exponential back-off
    return None


def _scrape_book_detail(detail_url: str) -> dict:
    """Scrape the individual book page for description and genre."""
    result = {"description": "", "genre": ""}
    soup = _get_soup(detail_url)
    if not soup:
        return result

    # Description is in the first <p> after #product_description
    desc_header = soup.find("div", id="product_description")
    if desc_header:
        desc_p = desc_header.find_next_sibling("p")
        if desc_p:
            result["description"] = desc_p.get_text(strip=True)

    # Genre is the second breadcrumb item
    breadcrumbs = soup.select("ul.breadcrumb li")
    if len(breadcrumbs) >= 3:
        result["genre"] = breadcrumbs[2].get_text(strip=True)

    return result


def scrape_books(max_pages: int = 5, fetch_details: bool = True) -> list[ScrapedBook]:
    """
    Scrape up to `max_pages` pages from books.toscrape.com.

    Args:
        max_pages:      Number of listing pages to scrape (50 pages total on site).
        fetch_details:  If True, visit each book's detail page for description + genre.

    Returns:
        List of ScrapedBook dataclass instances.
    """
    books: list[ScrapedBook] = []
    current_url = f"{BASE_URL}/catalogue/page-1.html"
    pages_done = 0

    logger.info(f"Starting scrape — up to {max_pages} pages")

    while current_url and pages_done < max_pages:
        soup = _get_soup(current_url)
        if not soup:
            logger.error(f"Failed to fetch page: {current_url}")
            break

        articles = soup.select("article.product_pod")
        logger.info(f"Page {pages_done + 1}: found {len(articles)} books")

        for article in articles:
            try:
                # Title
                h3 = article.find("h3")
                a_tag = h3.find("a")
                title = a_tag.get("title", a_tag.get_text(strip=True))

                # Book detail URL
                raw_href = a_tag["href"].replace("../", "")
                book_url = f"{CATALOGUE_URL}/{raw_href}"

                # Cover image
                img_tag = article.find("img")
                img_src = img_tag["src"].replace("../", "").replace("../../", "")
                cover_image_url = f"{BASE_URL}/{img_src}"

                # Rating (word → number)
                rating_tag = article.find("p", class_="star-rating")
                rating_word = rating_tag["class"][1] if rating_tag else "Zero"
                rating = RATING_MAP.get(rating_word)

                # Price
                price_tag = article.find("p", class_="price_color")
                price_text = price_tag.get_text(strip=True).replace("£", "").replace("Â", "").strip()
                price = float(price_text) if price_text else None

                # Availability
                avail_tag = article.find("p", class_="instock")
                availability = avail_tag.get_text(strip=True) if avail_tag else "Unknown"

                book = ScrapedBook(
                    title=title,
                    book_url=book_url,
                    cover_image_url=cover_image_url,
                    rating=rating,
                    price=price,
                    availability=availability,
                )

                # Fetch detail page for description + genre
                if fetch_details:
                    detail = _scrape_book_detail(book_url)
                    book.description = detail["description"]
                    book.genre = detail["genre"]
                    time.sleep(0.3)  # polite crawl delay

                books.append(book)

            except Exception as e:
                logger.warning(f"Error parsing article: {e}")
                continue

        # Follow "next" pagination link
        next_btn = soup.select_one("li.next a")
        if next_btn:
            next_href = next_btn["href"]
            if "catalogue/" in next_href:
                current_url = f"{BASE_URL}/{next_href}"
            else:
                current_url = f"{CATALOGUE_URL}/{next_href}"
        else:
            current_url = None

        pages_done += 1

    logger.info(f"Scrape complete — {len(books)} books collected")
    return books


# ── Standalone test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    results = scrape_books(max_pages=1, fetch_details=True)
    for b in results[:3]:
        print(f"\n{b.title}")
        print(f"  Genre      : {b.genre}")
        print(f"  Rating     : {b.rating}")
        print(f"  Price      : £{b.price}")
        print(f"  URL        : {b.book_url}")
        print(f"  Description: {b.description[:120]}...")
