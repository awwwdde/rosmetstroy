import re

import nh3

ALLOWED_TAGS = {
    "p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li",
    "blockquote", "code", "pre", "hr", "img", "figure", "figcaption", "table", "thead",
    "tbody", "tr", "th", "td",
}  # fmt: skip

ALLOWED_ATTRIBUTES = {
    "a": {"href", "title", "target"},
    "img": {"src", "alt", "title", "width", "height"},
    "th": {"colspan", "rowspan"},
    "td": {"colspan", "rowspan"},
}


def sanitize_html(html: str) -> str:
    return nh3.clean(
        html or "",
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        url_schemes={"http", "https", "mailto", "tel"},
        link_rel="noopener noreferrer",
    )


def reading_minutes(html: str) -> int:
    words = len(re.sub(r"<[^>]+>", " ", html or "").split())
    return max(1, round(words / 180))
